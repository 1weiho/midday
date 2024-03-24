import type { Provider } from "../interface";
import type { GetAccountsRequest, GetTransactionsRequest } from "../types";
import { PlaidApi } from "./plaid-api";
import { transformAccount, transformTransaction } from "./transform";

export class PlaidProvider implements Provider {
  #api: PlaidApi;

  constructor() {
    this.#api = new PlaidApi();
  }

  async getTransactions({
    accessToken,
    teamId,
    accountId,
    bankAccountId,
    latest,
  }: GetTransactionsRequest) {
    if (!accessToken || !accountId) {
      throw Error("accessToken or accountId is missing");
    }

    const response = await this.#api.getTransactions({
      accessToken,
      accountId,
      latest,
    });

    return response.map((transaction) =>
      transformTransaction({
        transaction,
        teamId,
        bankAccountId,
      })
    );
  }

  async getAccounts({ accessToken, institutionId }: GetAccountsRequest) {
    if (!accessToken || !institutionId) {
      throw Error("accessToken or institutionId is missing");
    }

    const response = await this.#api.getAccounts({
      accessToken,
      institutionId,
    });

    return response?.map(transformAccount);
  }
}
