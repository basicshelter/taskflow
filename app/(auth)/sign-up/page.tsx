import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create an account — Taskflow",
  description: "Create your Taskflow account and start making progress.",
};

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
