import type { AxiosInstance, AxiosRequestConfig } from "axios";
// import * as https from "node:https";
import axios from "xior";
import type {
  AuthenticatedRequest,
  GetAccountsResponse,
  GetTransactionsRequest,
  GetTransactionsResponse,
} from "./types";

export class TellerApi {
  #baseUrl = "https://api.teller.io";

  #api: AxiosInstance | null = null;

  async getAccounts({
    accessToken,
  }: AuthenticatedRequest): Promise<GetAccountsResponse> {
    return this.#get<GetAccountsResponse>("/accounts", accessToken);
  }

  async getTransactions({
    accountId,
    accessToken,
    latest,
  }: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    const result = await this.#get<GetTransactionsResponse>(
      `/accounts/${accountId}/transactions`,
      accessToken,
      latest && {
        count: 500,
      }
    );

    // NOTE: Remove pending transactions until upsert issue is fixed
    return result.filter((transaction) => transaction.status !== "pending");
  }

  async #getApi(accessToken: string): Promise<AxiosInstance> {
    const cert = Buffer.from(
      process.env.TELLER_CERTIFICATE!,
      "base64"
    ).toString("ascii");

    const key = Buffer.from(
      process.env.TELLER_CERTIFICATE_PRIVATE_KEY!,
      "base64"
    ).toString("ascii");

    // const agent = new https.Agent({
    //   cert,
    //   key,
    // });

    if (!this.#api) {
      this.#api = axios.create({
        // httpsAgent: agent,
        baseURL: this.#baseUrl,
        timeout: 30_000,
        headers: {
          Accept: "application/json",
        },
        auth: {
          username: accessToken,
          password: "",
        },
      });
    }

    return this.#api;
  }

  async #get<TResponse>(
    path: string,
    accessToken: string,
    params?: unknown,
    config?: AxiosRequestConfig
  ): Promise<TResponse> {
    const api = await this.#getApi(accessToken);

    return api
      .get<TResponse>(path, { params, ...config })
      .then(({ data }) => data);
  }
}
