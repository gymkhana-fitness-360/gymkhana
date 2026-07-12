#!/usr/bin/env python3
"""
Consolidate all payment CSV files into one master payment sheet.
"""

import csv
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Repo root: scripts/imports -> ../../data/payments
PAYMENTS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "payments"
PROCESSED_DIR = PAYMENTS_DIR / "processed"

# Files to exclude (member data, not payments)
EXCLUDE_PATTERNS = ['gym_members', 'gym_members_master', 'gym_members_backup']

# Payment files to include
PAYMENT_FILE_PATTERNS = ['payments.csv', 'payments_', 'day_payments_']


def get_payment_method(row, file_format):
    """Derive payment method from row based on file format."""
    if file_format == 'main':
        return row.get('payment_method', 'UNKNOWN').upper()
    # Monthly format: has cash, upi columns
    cash = float(row.get('cash', 0) or row.get('cash_amount', 0) or 0)
    upi = float(row.get('upi', 0) or row.get('upi_amount', 0) or 0)
    if cash > 0 and upi > 0:
        return 'MIXED'
    if cash > 0:
        return 'CASH'
    if upi > 0:
        return 'UPI'
    return 'UNKNOWN'


def get_member_name(row, file_format):
    """Get member name from row based on file format."""
    if file_format == 'main':
        return row.get('member_name', '').strip()
    return row.get('name', '').strip()


def get_date(row, file_format):
    """Get payment date from row."""
    return row.get('payment_date', '').strip()


def get_amount(row):
    """Get amount from row, handling various formats."""
    amt = row.get('amount', 0)
    if isinstance(amt, (int, float)):
        return float(amt)
    try:
        return float(str(amt).replace(',', '').strip())
    except (ValueError, TypeError):
        return 0.0


def parse_date(date_str):
    """Parse date string to datetime for sorting."""
    if not date_str:
        return None
    for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y']:
        try:
            return datetime.strptime(str(date_str).strip()[:10], fmt)
        except ValueError:
            continue
    return None


def load_payments_from_file(filepath):
    """Load payments from a single CSV file. Returns list of dicts."""
    payments = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            
            # Detect file format
            if 'member_name' in headers and 'payment_method' in headers:
                file_format = 'main'
            else:
                file_format = 'monthly'
            
            for row in reader:
                member_name = get_member_name(row, file_format)
                date_str = get_date(row, file_format)
                amount = get_amount(row)
                
                if not member_name or not date_str or amount <= 0:
                    continue
                
                payment_method = get_payment_method(row, file_format)
                parsed_date = parse_date(date_str)
                if not parsed_date:
                    continue
                
                payments.append({
                    'date': date_str[:10] if len(date_str) >= 10 else date_str,
                    'member_name': member_name,
                    'amount': amount,
                    'payment_method': payment_method,
                    'month': parsed_date.strftime('%B'),
                    'year': parsed_date.year,
                    '_sort_date': parsed_date
                })
    except Exception as e:
        print(f"  Warning: Could not read {filepath.name}: {e}")
    
    return payments


def main():
    print("Consolidating payment data...")
    
    all_payments = []
    files_processed = []
    
    # Source files are in gymflo/data/payments/processed/
    search_dirs = [PROCESSED_DIR] if PROCESSED_DIR.exists() else [PAYMENTS_DIR]
    for search_dir in search_dirs:
        for filepath in sorted(search_dir.glob('*.csv')):
            # Skip excluded files
            if any(pat in filepath.name for pat in EXCLUDE_PATTERNS):
                continue
            # Include payment files only
            if not any(filepath.name.startswith(pat.replace('*', '')) or filepath.name == pat
                       for pat in PAYMENT_FILE_PATTERNS):
                continue

            payments = load_payments_from_file(filepath)
            if payments:
                all_payments.extend(payments)
                files_processed.append((filepath.name, len(payments)))
                print(f"  Loaded {len(payments)} from {filepath.name}")
    
    print(f"\nTotal rows before dedup: {len(all_payments)}")
    
    # Remove duplicates: member name + date + amount
    seen = set()
    unique_payments = []
    for p in all_payments:
        key = (p['member_name'].upper().strip(), p['date'], p['amount'])
        if key not in seen:
            seen.add(key)
            unique_payments.append(p)
    
    print(f"Total rows after dedup: {len(unique_payments)}")
    
    # Sort by date (oldest to newest)
    unique_payments.sort(key=lambda x: x['_sort_date'])
    
    # Write MASTER_PAYMENTS.csv
    output_columns = ['Date', 'Member Name', 'Amount', 'Payment Method', 'Month', 'Year']
    master_path = PAYMENTS_DIR / 'MASTER_PAYMENTS.csv'
    
    with open(master_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=output_columns, extrasaction='ignore')
        writer.writeheader()
        for p in unique_payments:
            writer.writerow({
                'Date': p['date'],
                'Member Name': p['member_name'],
                'Amount': p['amount'],
                'Payment Method': p['payment_method'],
                'Month': p['month'],
                'Year': p['year']
            })
    
    print(f"\nSaved: {master_path}")
    
    # Generate summary statistics
    total_amount = sum(p['amount'] for p in unique_payments)
    by_year = defaultdict(lambda: {'count': 0, 'amount': 0})
    by_month = defaultdict(lambda: {'count': 0, 'amount': 0})
    by_method = defaultdict(lambda: {'count': 0, 'amount': 0})
    
    for p in unique_payments:
        by_year[p['year']]['count'] += 1
        by_year[p['year']]['amount'] += p['amount']
        month_key = f"{p['year']}-{p['month']}"
        by_month[month_key]['count'] += 1
        by_month[month_key]['amount'] += p['amount']
        by_method[p['payment_method']]['count'] += 1
        by_method[p['payment_method']]['amount'] += p['amount']
    
    # Build report
    report_lines = [
        "# Payment Summary Report",
        "",
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## Overview",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total Payments | {len(unique_payments):,} |",
        f"| Total Amount Collected | ₹{total_amount:,.2f} |",
        f"| Files Consolidated | {len(files_processed)} |",
        "",
        "## Breakdown by Year",
        "",
        "| Year | Payments | Amount (₹) |",
        "|------|----------|------------|"
    ]
    
    for year in sorted(by_year.keys()):
        data = by_year[year]
        report_lines.append(f"| {year} | {data['count']:,} | {data['amount']:,.2f} |")
    
    report_lines.extend([
        "",
        "## Breakdown by Month",
        "",
        "| Year-Month | Payments | Amount (₹) |",
        "|------------|----------|------------|"
    ])
    
    MONTH_ORDER = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])}
    def month_sort_key(k):
        parts = k.split('-', 1)
        year = int(parts[0]) if parts else 0
        month = MONTH_ORDER.get(parts[1], 0) if len(parts) > 1 else 0
        return (year, month)
    for month_key in sorted(by_month.keys(), key=month_sort_key):
        data = by_month[month_key]
        report_lines.append(f"| {month_key} | {data['count']:,} | {data['amount']:,.2f} |")
    
    report_lines.extend([
        "",
        "## Payment Method Distribution",
        "",
        "| Method | Payments | Amount (₹) | % of Total |",
        "|--------|----------|------------|------------|"
    ])
    
    for method in sorted(by_method.keys()):
        data = by_method[method]
        pct = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
        report_lines.append(f"| {method} | {data['count']:,} | {data['amount']:,.2f} | {pct:.1f}% |")
    
    report_lines.extend([
        "",
        "## Source Files",
        "",
        "| File | Records |",
        "|------|---------|"
    ])
    
    for fname, count in sorted(files_processed, key=lambda x: -x[1]):
        report_lines.append(f"| {fname} | {count:,} |")
    
    report_path = PAYMENTS_DIR / 'PAYMENT_SUMMARY_REPORT.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    
    print(f"Saved: {report_path}")
    
    return {
        'master_path': str(master_path),
        'total_payments': len(unique_payments),
        'total_amount': total_amount,
        'by_year': dict(by_year),
        'by_method': dict(by_method)
    }


if __name__ == '__main__':
    result = main()
    print("\n--- Summary ---")
    print(f"Master CSV: {result['master_path']}")
    print(f"Total payments: {result['total_payments']:,}")
    print(f"Total amount: ₹{result['total_amount']:,.2f}")
