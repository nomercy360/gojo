import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", defaultValue: "student" },
        nickname: { type: "string", required: false },
        jlptLevel: { type: "string", required: false },
      },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
