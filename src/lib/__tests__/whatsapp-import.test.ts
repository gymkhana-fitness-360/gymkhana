/**
 * WHATSAPP IMPORT EDGE CASES TESTS
 * 
 * Tests for WhatsApp payment parser validation
 */

import { describe, test, expect } from "@jest/globals";
import { parseWhatsAppPayments, ParsedMemberPayment, ParsedError } from "@/lib/whatsapp-payment-parser";

describe("WhatsApp Import Edge Cases", () => {
  describe("Valid Formats", () => {
    test("handles standard format with UPI", () => {
      const text = "Rahul Kumar 800 upi renewal";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.memberName).toBe("Rahul Kumar");
      expect(payment.amount).toBe(800);
      expect(payment.method).toBe("UPI");
      expect(payment.paymentType).toBe("renewal");
    });

    test("handles format with /- suffix", () => {
      const text = "Priya Singh 1500/- cash new";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.memberName).toBe("Priya Singh");
      expect(payment.amount).toBe(1500);
      expect(payment.method).toBe("CASH");
      expect(payment.paymentType).toBe("new");
    });

    test("handles GPay as UPI method", () => {
      const text = "Amit 700 gpay";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.method).toBe("UPI");
    });

    test("handles PhonePe as UPI method", () => {
      const text = "Neha 900 phonepe renewal";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.method).toBe("UPI");
    });
  });

  describe("Invalid Names", () => {
    test("rejects name that is too short", () => {
      const text = "R 800 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("error");
      
      const error = parsed[0] as ParsedError;
      expect(error.error).toContain("Invalid name");
    });

    test("rejects name that is only numbers", () => {
      const text = "123 800 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("error");
      
      const error = parsed[0] as ParsedError;
      expect(error.error).toContain("only numbers");
    });

    test("accepts name with numbers mixed in", () => {
      const text = "Rahul 2 800 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.memberName).toBe("Rahul 2");
    });
  });

  describe("Invalid Amounts", () => {
    test("rejects amount below minimum (₹100)", () => {
      const text = "Rahul Kumar 50 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("error");
      
      const error = parsed[0] as ParsedError;
      expect(error.error).toContain("below minimum");
      expect(error.error).toContain("₹100");
    });

    test("rejects amount above maximum (₹50,000)", () => {
      const text = "Rahul Kumar 60000 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("error");
      
      const error = parsed[0] as ParsedError;
      expect(error.error).toContain("above maximum");
      expect(error.error).toContain("₹50000");
    });

    test("accepts amount at minimum boundary", () => {
      const text = "Rahul Kumar 100 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.amount).toBe(100);
    });

    test("accepts amount at maximum boundary", () => {
      const text = "Rahul Kumar 50000 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.amount).toBe(50000);
    });
  });

  describe("Missing Payment Method", () => {
    test("defaults to CASH when method not specified", () => {
      const text = "Rahul Kumar 800 renewal";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.method).toBe("CASH");
    });

    test("defaults to CASH when only amount provided", () => {
      const text = "Rahul Kumar 800";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.method).toBe("CASH");
    });
  });

  describe("Bulk Import", () => {
    test("handles multiple valid lines", () => {
      const text = `Rahul Kumar 800 upi renewal
Priya Singh 1500 cash new
Amit Sharma 700 gpay`;
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(3);
      expect(parsed.filter(p => p.type === "member_payment")).toHaveLength(3);
    });

    test("handles mix of valid and invalid lines", () => {
      const text = `Rahul Kumar 800 upi renewal
R 50 upi
Priya Singh 1500 cash new`;
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(3);
      expect(parsed.filter(p => p.type === "member_payment")).toHaveLength(2);
      expect(parsed.filter(p => p.type === "error")).toHaveLength(1);
    });

    test("skips empty lines", () => {
      const text = `Rahul Kumar 800 upi

Priya Singh 1500 cash

`;
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(2);
      expect(parsed.filter(p => p.type === "member_payment")).toHaveLength(2);
    });
  });

  describe("Cash Out and Cash Update", () => {
    test("parses cash out lines", () => {
      const text = "200 cash out";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("cash_out");
    });

    test("parses cash update lines", () => {
      const text = "Cash update Box a ache 1517/-";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("cash_update");
    });

    test("does not parse member payments from cash out lines", () => {
      const text = "200 cash out";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed[0].type).not.toBe("member_payment");
    });
  });

  describe("Edge Cases", () => {
    test("handles names with special characters", () => {
      const text = "O'Brien 800 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.memberName).toBe("O'Brien");
    });

    test("handles decimal amounts", () => {
      const text = "Rahul Kumar 799.50 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.amount).toBe(799.5);
    });

    test("handles multiple spaces in name", () => {
      const text = "Rahul   Kumar 800 upi";
      const parsed = parseWhatsAppPayments(text);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe("member_payment");
      
      const payment = parsed[0] as ParsedMemberPayment;
      expect(payment.memberName).toBe("Rahul Kumar");
    });

    test("preserves line numbers for errors", () => {
      const text = `Valid Name 800 upi
R 50 upi
Another Valid 700 cash`;
      const parsed = parseWhatsAppPayments(text);

      const error = parsed.find(p => p.type === "error") as ParsedError;
      expect(error).toBeDefined();
      expect(error.lineNumber).toBe(2);
    });
  });
});
