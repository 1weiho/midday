"use server";

import { client } from "@midday/kv";
import { capitalCase } from "change-case";

const baseUrl = "https://bankaccountdata.gocardless.com";

const ONE_HOUR = 3600;
const ACCESS_VALID_FOR_DAYS = 180;
const MAX_HISTORICAL_DAYS = 730;

const keys = {
  accessToken: "go_cardless_access_token_v2",
  refreshToken: "go_cardless_refresh_token_v2",
  banks: "go_cardless_banks",
};

async function getRefreshToken(refresh: string) {
  const res = await fetch(`${baseUrl}/api/v2/token/refresh/`, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh,
    }),
  });

  const result = await res.json();

  await client.set(keys.accessToken, result.access, {
    ex: result.access_expires - ONE_HOUR,
    nx: true,
  });

  return result.access;
}

async function getAccessToken() {
  const [accessToken, refreshToken] = await Promise.all([
    client.get(keys.accessToken),
    client.get(keys.refreshToken),
  ]);

  if (accessToken) {
    return accessToken;
  }

  if (refreshToken) {
    return getRefreshToken(refreshToken);
  }

  const res = await fetch(`${baseUrl}/api/v2/token/new/`, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  });

  const result = await res.json();

  await Promise.all([
    client.set(keys.accessToken, result.access, {
      ex: result.access_expires - ONE_HOUR,
      nx: true,
    }),
    client.set(keys.refreshToken, result.refresh, {
      ex: result.refresh_expires - ONE_HOUR,
      nx: true,
    }),
  ]);

  return result.access;
}

export async function getBanks(countryCode: string) {
  const token = await getAccessToken();

  const res = await fetch(
    `${baseUrl}/api/v2/institutions/?country=${countryCode.toLowerCase()}`,
    {
      cache: "no-cache",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.json();
}

export async function createEndUserAgreement(institutionId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/api/v2/agreements/enduser/`, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      institution_id: institutionId,
      access_scope: ["balances", "details", "transactions"],
      access_valid_for_days: ACCESS_VALID_FOR_DAYS,
      max_historical_days: MAX_HISTORICAL_DAYS,
    }),
  });

  return res.json();
}

type BuildLinkOptions = {
  institutionId: string;
  agreement: string;
  redirect: string;
};

export async function buildLink({
  institutionId,
  agreement,
  redirect,
}: BuildLinkOptions) {
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/api/v2/requisitions/`, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      redirect,
      institution_id: institutionId,
      agreement,
    }),
  });

  return res.json();
}

export async function getAccountDetails(id: string) {
  const token = await getAccessToken();

  const [account, details] = await Promise.all([
    fetch(`${baseUrl}/api/v2/accounts/${id}/`, {
      method: "GET",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }),
    fetch(`${baseUrl}/api/v2/accounts/${id}/details/`, {
      method: "GET",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }),
  ]);

  const accountData = await account.json();
  const detailsData = await details.json();

  return {
    ...accountData,
    ...detailsData?.account,
  };
}

type GetAccountsOptions = {
  accountId: string;
  countryCode: string;
};

export async function getAccounts({
  accountId,
  countryCode,
}: GetAccountsOptions) {
  const token = await getAccessToken();
  const banks = await getBanks(countryCode);

  const res = await fetch(`${baseUrl}/api/v2/requisitions/${accountId}/`, {
    method: "GET",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  const result = await Promise.all(
    data.accounts?.map(async (id) => {
      const accountData = await getAccountDetails(id);

      return {
        ...accountData,
        bank: banks.find((bank) => bank.id === accountData.institution_id),
      };
    })
  );

  return result;
}

type GetTransactionsParams = {
  accountId: string;
  date_from?: string;
  date_to?: string;
};

export async function getTransactions(params: GetTransactionsParams) {
  const token = await getAccessToken();

  const url = new URL(
    `${baseUrl}/api/v2/accounts/${params.accountId}/transactions/`
  );

  if (params.date_from) {
    url.searchParams.append("date_from", params.date_from);
  }

  if (params.date_to) {
    url.searchParams.append("date_from", params.date_to);
  }

  const result = await fetch(url.toString(), {
    cache: "no-cache",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return result.json();
}

export async function getRequisitions() {
  const token = await getAccessToken();

  const result = await fetch(`${baseUrl}/api/v2/requisitions/`, {
    method: "GET",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return result.json();
}

export async function deleteRequisition(id: string) {
  const token = await getAccessToken();

  const result = await fetch(`${baseUrl}/api/v2/requisitions/${id}/`, {
    method: "DELETE",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return result.json();
}

export const mapTransactionMethod = (method: string) => {
  switch (method) {
    case "Payment":
    case "Bankgiro payment":
    case "Incoming foreign payment":
      return "payment";
    case "Card purchase":
    case "Card foreign purchase":
      return "card_purchase";
    case "Card ATM":
      return "card_atm";
    case "Transfer":
      return "transfer";
    default:
      return "other";
  }
};

const transformName = (transaction) => {
  if (transaction?.additionalInformation) {
    return capitalCase(transaction.additionalInformation);
  }

  if (transaction?.remittanceInformationStructured) {
    return capitalCase(transaction.remittanceInformationStructured);
  }

  if (transaction?.remittanceInformationUnstructured) {
    return capitalCase(transaction.remittanceInformationUnstructured);
  }

  if (transaction?.creditorName) {
    return capitalCase(transaction.creditorName);
  }

  if (transaction?.debtorName) {
    return capitalCase(transaction?.debtorName);
  }

  if (transaction?.remittanceInformationUnstructuredArray?.at(0)) {
    return capitalCase(
      transaction.remittanceInformationUnstructuredArray?.at(0)
    );
  }

  console.log("No transaction name", transaction);
};

const transformDescription = (transaction, name) => {
  if (transaction?.remittanceInformationUnstructuredArray?.length) {
    const text = transaction?.remittanceInformationUnstructuredArray.join(" ");
    const description = capitalCase(text);

    // NOTE: Sometimes the description is the same as name
    // Let's skip that and just save if they are not the same
    if (description !== name) {
      return description;
    }
  }
};

export const transformTransactions = (transactions, { teamId, accountId }) => {
  // We want to insert transactions in reversed order so the incremental id in supabase is correct
  return transactions?.reverse().map((transaction) => {
    const method = mapTransactionMethod(
      transaction.proprietaryBankTransactionCode
    );

    let currencyExchange: { rate: number; currency: string } | undefined;

    if (Array.isArray(transaction.currencyExchange)) {
      const rate = Number.parseFloat(
        transaction.currencyExchange.at(0)?.exchangeRate ?? ""
      );

      if (rate) {
        const currency = transaction.currencyExchange.at(0)?.sourceCurrency;

        if (currency) {
          currencyExchange = {
            rate,
            currency,
          };
        }
      }
    }

    const name = transformName(transaction);

    return {
      date: transaction.valueDate,
      name,
      method: method || "unknown",
      internal_id: `${teamId}_${transaction.internalTransactionId}`,
      amount: transaction.transactionAmount.amount,
      currency: transaction.transactionAmount.currency,
      bank_account_id: accountId,
      category: transaction.transactionAmount.amount > 0 ? "income" : null,
      team_id: teamId,
      currency_rate: currencyExchange?.rate,
      currency_source: currencyExchange?.currency,
      balance: transaction?.balanceAfterTransaction?.balanceAmount?.amount,
      description: transformDescription(transaction, name),
      status: "posted",
    };
  });
};
