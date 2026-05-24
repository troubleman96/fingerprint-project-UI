import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// Keep TanStack Start's default request flow, but intercept unknown server errors
// so production users see the branded HTML fallback instead of a raw stack response.
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// The app only defines a single custom request middleware right now: server-side
// error normalization for routes rendered through TanStack Start.
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
