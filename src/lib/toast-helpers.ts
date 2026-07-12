/**
 * Toast Helper Functions
 * Centralized toast notifications with consistent styling
 */

import { toast } from "sonner";

export const toastHelpers = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  // Common messages
  saved: () => toast.success("Changes saved successfully"),
  deleted: () => toast.success("Deleted successfully"),
  created: () => toast.success("Created successfully"),
  updated: () => toast.success("Updated successfully"),
  
  saveFailed: () => toast.error("Failed to save changes"),
  deleteFailed: () => toast.error("Failed to delete"),
  createFailed: () => toast.error("Failed to create"),
  updateFailed: () => toast.error("Failed to update"),
  
  networkError: () => toast.error("Network error. Please try again."),
  unauthorized: () => toast.error("You don't have permission to perform this action"),
};
