import { ErrorSchema } from "@/common/schema";
import { Provider } from "@/providers";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { env } from "hono/adapter";
import { AccountsParamsSchema, AccountsSchema } from "./schema";

const app = new OpenAPIHono();

const indexRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: AccountsParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AccountsSchema,
        },
      },
      description: "Retrieve accounts",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Returns an error",
    },
  },
});

app.openapi(indexRoute, async (c) => {
  const envs = env(c);
  const { provider, ...rest } = c.req.query();

  const api = new Provider({
    provider,
    envs,
  });

  const data = await api.getAccounts(rest);

  return c.json(
    {
      data,
    },
    200
  );
});

export default app;
