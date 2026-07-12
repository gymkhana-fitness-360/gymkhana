import { parsePaymentText, parseFlexibleDate, toTitleCase } from "../text-parser.service";
import { PaymentMethod } from "@prisma/client";

describe("parseFlexibleDate", () => {
  it("parses DD.MM.YYYY", () => {
    const d = parseFlexibleDate("16.03.2026");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(16);
  });
});

describe("parsePaymentText", () => {
  it("parses rupee prefix and glued amount+method", () => {
    const p = parsePaymentText("₹799upi renewal Rahul Verma");
    expect(p.amount).toBe(799);
    expect(p.method).toBe(PaymentMethod.UPI);
    expect(p.name.toLowerCase()).toContain("rahul");
  });

  it("parses rs. prefix", () => {
    const p = parsePaymentText("Rs. 700 cash Amit");
    expect(p.amount).toBe(700);
    expect(p.method).toBe(PaymentMethod.CASH);
  });

  it("parses method typo upii", () => {
    const p = parsePaymentText("800 upii Jane Doe");
    expect(p.amount).toBe(800);
    expect(p.method).toBe(PaymentMethod.UPI);
  });

  it("fallback: method before amount", () => {
    const p = parsePaymentText("cash 700 renewal Suresh Kumar");
    expect(p.amount).toBe(700);
    expect(p.method).toBe(PaymentMethod.CASH);
  });

  it("parses renewal typo renwal", () => {
    const p = parsePaymentText("700 upi renwal Deepak");
    expect(p.duration).toBe("1 Month Renewal");
  });

  it("strips commas from name tokens", () => {
    const p = parsePaymentText("700 upi, Akash Das,");
    expect(p.name).toMatch(/Akash Das/i);
  });

  it("parses split payments amount method amount method", () => {
    const p = parsePaymentText("400 cash 300 upi Ravi");
    expect(p.splitPayments).toEqual([
      { amount: 400, method: PaymentMethod.CASH },
      { amount: 300, method: PaymentMethod.UPI },
    ]);
    expect(p.amount).toBeNull();
    expect(p.name.toLowerCase()).toContain("ravi");
  });

  it("parses method prelude then two amounts", () => {
    const p = parsePaymentText("cash upi 400 300 Neha");
    expect(p.splitPayments).toEqual([
      { amount: 400, method: PaymentMethod.CASH },
      { amount: 300, method: PaymentMethod.UPI },
    ]);
    expect(p.name.toLowerCase()).toContain("neha");
  });

  it("parses admission amount method before name", () => {
    const p = parsePaymentText("admission 699 upi Karan Singh");
    expect(p.duration).toBe("New Admission");
    expect(p.amount).toBe(699);
    expect(p.method).toBe(PaymentMethod.UPI);
    expect(p.name.toLowerCase()).toContain("karan");
  });

  it("parses new admission bigram with payment", () => {
    const p = parsePaymentText("new admission 1200 cash Priya");
    expect(p.duration).toBe("New Admission");
    expect(p.amount).toBe(1200);
    expect(p.method).toBe(PaymentMethod.CASH);
  });

  it("splits glued amount and indian mobile", () => {
    const p = parsePaymentText("6999876543210 upi Arjun");
    expect(p.amount).toBe(699);
    expect(p.phone).toBe("9876543210");
    expect(p.method).toBe(PaymentMethod.UPI);
  });

  it("does not treat 10-digit mobile as amount", () => {
    const p = parsePaymentText("9876543210 upi 500 cash Suresh");
    expect(p.phone).toBe("9876543210");
    expect(p.amount).toBe(500);
    expect(p.method).toBe(PaymentMethod.CASH);
  });

  it("drops garbage tokens from name", () => {
    const p = parsePaymentText("700 upi payment split paid for Vikram");
    expect(p.name.toLowerCase()).toBe("vikram");
  });

  describe("real gym WhatsApp / sheet lines", () => {
    const lines = [
      "Bablu Chowdhury 800 UPI Renewal 30/03/2026",
      "Sima Mahato 699 Cash Renewal 26/03/2026",
      "Moloy Mondal 700 Cash Renewal 30/03/2026",
      "Nabajyoti Mondal 700 UPI Renewal 30/03/2026",
      "Bedita Swarnakar 699 UPI Renewal 24/03/2026",
      "Raju Sarkar 2600 UPI PT Renewal 24/03/2026",
      "Chayan Pandit 700 Renewal 24/03/2026",
      "Dhanoj Shaw 800 UPI Renewal 25/03/2026",
      "Deep Majumder 700 Cash Renewal 28/03/2026",
      "Baidurya Swarnakar 799 UPI Renewal 28/03/2026",
      "Sima Mahato 700 Cash Renewal 26/03/2026",
      "Riya Maan 800 Cash Renewal 26/03/2026",
      "Rohit Makal 700 Cash Renewal 25/03/2026",
      "Sagnik Ghosh 700 UPI Renewal 31/03/2026",
    ];

    it.each(lines)('parses renewal line: "%s"', (line) => {
      const p = parsePaymentText(line);
      expect(p.duration).toBe("1 Month Renewal");
      expect(p.amount != null || (p.splitPayments && p.splitPayments.length > 0)).toBe(true);
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.date).not.toBeNull();
    });

    it("parses split with orphan amount ignored: 700 Cash 400 + UPI 300 → 700 CASH + 300 UPI", () => {
      const p = parsePaymentText("Anup Saha 700 Cash 400 + UPI 300 Renewal 24/03/2026");
      expect(p.duration).toBe("1 Month Renewal");
      expect(p.splitPayments).toEqual([
        { amount: 700, method: PaymentMethod.CASH },
        { amount: 300, method: PaymentMethod.UPI },
      ]);
      expect(p.name.toLowerCase()).toContain("anup");
      expect(p.name).not.toContain("400");
    });

    it("parses new admission with phone before phrase", () => {
      const p = parsePaymentText("Dulal Majhi 6289132551 New Admission 699 Cash 30/03/2026");
      expect(p.duration).toBe("New Admission");
      expect(p.phone).toBe("6289132551");
      expect(p.amount).toBe(699);
      expect(p.method).toBe(PaymentMethod.CASH);
      expect(p.name.toLowerCase()).toContain("dulal");
    });

    it("parses new admission with phone and UPI", () => {
      const p = parsePaymentText("Anjali Chakraborti 9836315989 New Admission 799 UPI 31/03/2026");
      expect(p.duration).toBe("New Admission");
      expect(p.phone).toBe("9836315989");
      expect(p.amount).toBe(799);
      expect(p.method).toBe(PaymentMethod.UPI);
    });

    it("parses new admission with phone (second sample)", () => {
      const p = parsePaymentText("Subrata Besra 8910866272 New Admission 699 Cash 30/03/2026");
      expect(p.duration).toBe("New Admission");
      expect(p.phone).toBe("8910866272");
      expect(p.amount).toBe(699);
      expect(p.method).toBe(PaymentMethod.CASH);
    });

    it("implicit UPI for amount then renewal only", () => {
      const p = parsePaymentText("Chayan Pandit 700 Renewal 24/03/2026");
      expect(p.amount).toBe(700);
      expect(p.method).toBe(PaymentMethod.UPI);
      expect(p.duration).toBe("1 Month Renewal");
    });
  });
});

describe("toTitleCase", () => {
  it("title-cases words", () => {
    expect(toTitleCase("john doe")).toBe("John Doe");
  });
});
