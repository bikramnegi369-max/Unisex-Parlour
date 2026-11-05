import { useMutation } from "@tanstack/react-query";
import { sendSubscriptionOtp } from "../api/subscriptions.api";
import type { SendOtpPayload, SendOtpResult } from "../types/subscription.types";

export interface SendSubscriptionOtpVariables {
  id: string;
  payload?: SendOtpPayload;
}

export function useSendSubscriptionOtp() {
  return useMutation<SendOtpResult, Error, SendSubscriptionOtpVariables | string>({
    mutationFn: (variables: SendSubscriptionOtpVariables | string) => {
      if (typeof variables === "string") {
        return sendSubscriptionOtp(variables);
      }
      return sendSubscriptionOtp(variables.id, variables.payload);
    },
  });
}
