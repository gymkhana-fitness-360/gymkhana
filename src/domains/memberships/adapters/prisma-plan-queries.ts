import { prisma } from "@/lib/prisma";
import type { Plan } from "@prisma/client";
import type { IPlanCommands, IPlanQueries, UpdatePlanInputDTO } from "../interfaces";
import type { PlanDTO } from "../types";

export class PrismaPlanQueries implements IPlanQueries, IPlanCommands {
  async listPlans(
    gymId: string,
    options?: { includeInactive?: boolean }
  ): Promise<PlanDTO[]> {
    const where: { gymId: string; isActive?: boolean } = { gymId };
    if (!options?.includeInactive) {
      where.isActive = true;
    }
    const rows = await prisma.plan.findMany({
      where,
      orderBy: [{ durationDays: "asc" }, { name: "asc" }],
    });
    return rows.map((p) => this.toDTO(p));
  }

  async getPlan(gymId: string, planId: string): Promise<PlanDTO | null> {
    const p = await prisma.plan.findFirst({
      where: { id: planId, gymId },
    });
    return p ? this.toDTO(p) : null;
  }

  async updatePlan(
    gymId: string,
    planId: string,
    input: UpdatePlanInputDTO
  ): Promise<PlanDTO> {
    const existing = await prisma.plan.findFirst({ where: { id: planId, gymId } });
    if (!existing) {
      throw new PlanNotFoundError();
    }
    const p = await prisma.plan.update({
      where: { id: planId },
      data: input,
    });
    return this.toDTO(p);
  }

  async deactivatePlan(gymId: string, planId: string): Promise<PlanDTO> {
    return this.updatePlan(gymId, planId, { isActive: false });
  }

  private toDTO(p: Plan): PlanDTO {
    return {
      id: p.id,
      gymId: p.gymId,
      name: p.name,
      durationDays: p.durationDays,
      price: Number(p.price),
      description: p.description,
      isActive: p.isActive,
    };
  }
}

export class PlanNotFoundError extends Error {
  constructor() {
    super("Plan not found");
    this.name = "PlanNotFoundError";
  }
}
