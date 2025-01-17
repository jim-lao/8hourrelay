"use client";
import { useAuth } from "@/context/AuthContext";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import LoginFirst from "./LoginFirst";

function LayoutSecure({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  const { store } = useAuth();
  useEffect(() => {
    if (store.error) {
      setTimeout(() => {
        store.resetError();
      }, 5000);
    }
  }, [store.error]);
  return (
    <div className="relative flex justify-center w-full min-h-full grow">
      {store.authStore.isAuthenticated ? (
        <div className="flex justify-center w-full md:w-[800px]">
          {children}
        </div>
      ) : (
        <LoginFirst />
      )}
    </div>
  );
}

export default observer(LayoutSecure);
