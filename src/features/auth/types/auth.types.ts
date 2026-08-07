import { ApiResponse } from "@/types/api.types";

export type LoginResponseData =
  | {
      requireActivation: true;
      activationToken: string;
      accessToken?: never;
    }
  | {
      requireActivation?: false;
      accessToken: string;
      activationToken?: never;
    };

export type LoginApiResponse = ApiResponse<LoginResponseData>;

export interface ActivationOtpSendData {
  expiresIn: number;
  resendAfter: number;
}

export type ActivationOtpSendApiResponse = ApiResponse<ActivationOtpSendData>;

export interface ActivationOtpVerifyData {
  passwordChangeToken: string;
}

export type ActivationOtpVerifyApiResponse = ApiResponse<ActivationOtpVerifyData>;

export interface ActivationPasswordData {
  accessToken: string;
}

export type ActivationPasswordApiResponse = ApiResponse<ActivationPasswordData>;
