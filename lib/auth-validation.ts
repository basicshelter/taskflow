import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Your name must be at least 2 characters."),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Your password must be at least 8 characters."),
});

export type AuthField = "name" | "email" | "password";
