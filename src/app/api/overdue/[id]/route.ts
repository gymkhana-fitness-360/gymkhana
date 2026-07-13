import { NextRequest } from "next/server";
import {
  deleteOverdueByIdHandler,
  patchOverdueByIdHandler,
} from "@/domains/collections/handlers/overdue-by-id";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return patchOverdueByIdHandler(request, id);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return deleteOverdueByIdHandler(request, id);
}
