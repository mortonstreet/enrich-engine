import { ValidatedRequestHandler } from "@/types/handlers";
import * as waitlistService from "@/services/waitlist.service";
import { WaitlistRequest } from "@shared/types/src";

export const addToWaitlist: ValidatedRequestHandler<WaitlistRequest> = async (
  req,
  res,
) => {
  const { email, source } = req.validated;

  const result = await waitlistService.addToWaitlist({ email, source });

  res.json(result);
};
