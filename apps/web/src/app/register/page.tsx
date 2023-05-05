"use client";
import { ActivityIndicator, Surface, TextInput } from "react-native-paper";
import { loadStripe } from "@stripe/stripe-js";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Formik, Field, Form, ErrorMessage } from "formik";

import { Button } from "ui";
import Register from "../../content/register.mdx";
import { useAuth } from "@/context/AuthContext";
import { LoginWithEmailScreen } from "@8hourrelay/login";
import Step1 from "./Step1";
import Login from "./Login";
import Email from "./Email";
// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
const styles = {
  label: "block text-sm font-bold pt-2 pb-1",
  field:
    "bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none",
  button: "btn btn-primary py-2 px-4 w-full",
  errorMsg: "text-red-500 text-sm",
};

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store } = useAuth();
  const { authStore, userStore } = store;

  const [state, setState] = useState("init");

  const sessionId = searchParams.get("session_id");
  const apiKey = searchParams.get("apiKey");
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  // use click on login link will trigger below event
  useEffect(() => {
    async function sigininWithEmail() {
      if (typeof window !== "undefined") {
        const fullUrl = window.location.href;
        await authStore.signinWithEmailLink(fullUrl);
      }
    }
    sigininWithEmail();
  }, []);

  // use click on login link will trigger below event
  useEffect(() => {
    if (authStore.state === "VERFIED") {
      router.push("/register?continue");
      authStore.setState("INIT");
    }
  }, [authStore.state]);

  if (canceled) {
    return <div>Your payment canceled!</div>;
  }
  if (success && sessionId) {
    return (
      <div className="flex h-full">
        <div>You successfully registered! Now </div>
      </div>
    );
  }

  // if no logined user yet
  if (!userStore.user) {
    return (
      <div className="w-full md:max-w-[800px] h-full">
        {authStore.state === "INIT" && (
          <>
            <div className="text-center text-lg pt-10">
              Please login to register to a race. Enter your email and will send
              you a login link
            </div>
            <Login />
          </>
        )}
        {authStore.state === "EMAIL_LINK_SENT" && (
          <div>
            Check your email {authStore.email} and click the link to continue
            the register
          </div>
        )}
        {authStore.state === "MISSING_EMAIL" && (
          <div className="text-center text-lg pt-10">
            <div className="text-center text-lg pt-10">
              Please provide your email for confirmation
            </div>
            <Email />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-center pt-10">
      {/* <div className="prose mx-2"> */}
      {/* <Register /> */}
      {/* </div> */}
      <Step1 />
    </div>
  );
}

export default observer(Page);
