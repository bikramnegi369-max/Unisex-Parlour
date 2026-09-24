import { useMutation } from "@tanstack/react-query";
import { sendSubscriptionOtp } from "../api/subscriptions.api";

export function useSendSubscriptionOtp() {
  return useMutation({
    mutationFn: (id: string) => sendSubscriptionOtp(id),
  });
}
