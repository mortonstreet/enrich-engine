import * as waitlistRepository from "@/repositories/waitlist.repository";
import { WaitlistRequest, WaitlistResponse } from "@shared/types/src";
import logger from "@/lib/logger";

export const addToWaitlist = async (
  request: WaitlistRequest,
): Promise<WaitlistResponse> => {
  // Check if email already exists
  const existing = await waitlistRepository.findByEmail(request.email);

  if (existing) {
    return {
      success: true,
      message: "You are already on the waitlist!",
    };
  }

  const entry = await waitlistRepository.create({
    email: request.email,
    source: request.source,
  });

  if (!entry) {
    throw new Error("Failed to add to waitlist");
  }

  logger.info(
    { email: request.email, source: request.source },
    "Added to waitlist",
  );

  return {
    success: true,
    message: "Successfully added to waitlist!",
  };
};
