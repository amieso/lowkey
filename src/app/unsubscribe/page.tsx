"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-email">("loading")

  useEffect(() => {
    if (!email) {
      setStatus("no-email")
      return
    }

    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (res.ok) {
          setStatus("success")
        } else {
          setStatus("error")
        }
      })
      .catch(() => setStatus("error"))
  }, [email])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[560px] px-4 sm:px-6 py-12">
        {status === "loading" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-4">unsubscribing...</h1>
            <p className="text-sm text-muted leading-relaxed">please wait</p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-4">unsubscribed</h1>
            <p className="text-sm text-muted leading-relaxed">
              you've been removed from our mailing list and won't receive any more emails from us.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-4">something went wrong</h1>
            <p className="text-sm text-muted leading-relaxed">
              we couldn't unsubscribe you. please try again or contact{" "}
              <a href="mailto:hello@lowkey.so" className="text-foreground hover:underline">
                hello@lowkey.so
              </a>
            </p>
          </>
        )}
        {status === "no-email" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-4">invalid link</h1>
            <p className="text-sm text-muted leading-relaxed">
              this unsubscribe link is missing required information. please use the link from your email.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
