"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useState, type ComponentType } from "react";
import {
  Plus,
  Save,
  Trash2,
  Users,
  Building2,
  Bell,
  Crown,
  Check,
  Shield,
  UserCircle,
  Palette,
  Database,
  CircleHelp,
  LockKeyhole,
} from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createOne,
  removeOne,
} from "@/lib/firestore/helpers";
import {
  setDoc,
  doc,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  linkWithCredential,
  sendEmailVerification,
  updatePassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { CURRENCIES } from "@/lib/constants";
import { toMinor, toMajor } from "@/lib/money";
import {
  PLANS,
  formatPrice,
  planMeta,
} from "@/lib/plans";
import type {
  PlanId,
  VendorKind,
} from "@/types";

type SettingsSection =
  | "account"
  | "business"
  | "security"
  | "notifications"
  | "appearance"
  | "privacy"
  | "subscription"
  | "faq";

export default function SettingsPage() {
  const {
    business,
    role,
    members,
    vendors,
    accounts,
    categories,
    transactions,
    recurring,
    alerts,
    reload,
    loading,
  } = useBusiness();
  

  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  const [businessName, setBusinessName] =
    useState("");

  const [currency, setCurrency] =
    useState("USD");

  const [threshold, setThreshold] =
    useState("500.00");

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState<string | null>(null);

  const [notificationSaving, setNotificationSaving] =
    useState(false);

  const [notificationStatus, setNotificationStatus] =
    useState<string | null>(null);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteRole, setInviteRole] =
    useState<"manager" | "staff">("staff");

  const [inviteLoading, setInviteLoading] =
    useState(false);

  const [inviteError, setInviteError] =
    useState("");

  const [inviteUrl, setInviteUrl] =
    useState("");

  const [inviteCopied, setInviteCopied] =
    useState(false);

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [passwordStatus, setPasswordStatus] =
    useState<string | null>(null);

    const [verificationStatus, setVerificationStatus] =
  useState<string | null>(null);

const [verificationSending, setVerificationSending] =
  useState(false);
  const [vendorName, setVendorName] =
    useState("");

  const [vendorKind, setVendorKind] =
    useState<VendorKind>("supplier");

  const [vendorError, setVendorError] =
    useState<string | null>(null);

  const [upgrading, setUpgrading] =
    useState<Exclude<PlanId, null> | null>(
      null
    );

  const [planNotice, setPlanNotice] =
    useState<string | null>(null);

  const [displayName, setDisplayName] =
    useState("");

  const [accountSaving, setAccountSaving] =
    useState(false);

  const [accountStatus, setAccountStatus] =
    useState<string | null>(null);

  const [theme, setTheme] =
  useState<"system" | "light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const savedTheme = localStorage.getItem(
      "cashflow-theme"
    );

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      return savedTheme;
    }

    useEffect(() => {
  localStorage.setItem(
    "cashflow-theme",
    theme
  );

  const root = document.documentElement;

  root.classList.remove("light", "dark");

  if (theme === "light") {
    root.classList.add("light");
  }

  if (theme === "dark") {
    root.classList.add("dark");
  }

  if (theme === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    root.classList.add(
      prefersDark ? "dark" : "light"
    );
  }
}, [theme]);

useEffect(() => {
  if (theme !== "system") {
    return;
  }

  const mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  const handleChange = (event: MediaQueryListEvent) => {
    document.documentElement.classList.remove(
      "light",
      "dark"
    );

    document.documentElement.classList.add(
      event.matches ? "dark" : "light"
    );
  };

  mediaQuery.addEventListener(
    "change",
    handleChange
  );

  return () => {
    mediaQuery.removeEventListener(
      "change",
      handleChange
    );
  };
}, [theme]);

    return "system";
  });

  const [openFaq, setOpenFaq] =
    useState<number | null>(null);

  const current = planMeta(
    business?.plan
  );

  /*
   * Synchronize settings with loaded
   * Firebase data.
   */
  useEffect(() => {
    if (business?.name) {
      setBusinessName(business.name);
    }

    if (profile?.currency) {
      setCurrency(profile.currency);
    }

    if (
      profile?.lowBalanceThreshold !==
        undefined &&
      profile?.lowBalanceThreshold !== null
    ) {
      setThreshold(
        toMajor(
          profile.lowBalanceThreshold
        ).toFixed(2)
      );
    }

    setDisplayName(
      profile?.displayName ??
        user?.displayName ??
        ""
    );
  }, [
    business?.name,
    profile?.currency,
    profile?.lowBalanceThreshold,
    profile?.displayName,
    user?.displayName,
  ]);

  /*
   * Load saved theme.
   */
  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "cashflow-theme"
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      setTheme(savedTheme);
    }
  }, []);

  /*
   * Apply selected theme.
   */
  useEffect(() => {
    const root =
      document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;

      root.classList.toggle(
        "dark",
        prefersDark
      );
    }

    window.localStorage.setItem(
      "cashflow-theme",
      theme
    );
  }, [theme]);

  /*
   * Verify Paystack payment after returning
   * from checkout.
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const reference =
      params.get("reference") ??
      params.get("trxref");

    const plan =
      params.get("plan") as
        | Exclude<PlanId, null>
        | null;

    if (
      reference &&
      plan &&
      user &&
      business?.id
    ) {
      (async () => {
        try {
          const token =
            await user.getIdToken();

          const res =
            await fetch(
              "/api/paystack/verify",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  reference,
                  businessId:
                    business.id,
                  plan,
                }),
              }
            );

          if (res.ok) {
            setPlanNotice(
              `Payment received — you're on the ${planMeta(plan).name} plan now.`
            );
          }
        } finally {
          window.history.replaceState(
            {},
            "",
            "/settings#subscription"
          );

          await reload();
        }
      })();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, business?.id]);

  /*
   * Save account details.
   */
  async function saveAccount(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!user || !profile) {
      return;
    }

    const name =
      displayName.trim();

    if (!name) {
      setAccountStatus(
        "Please enter your name."
      );
      return;
    }

    setAccountSaving(true);
    setAccountStatus(null);

    try {
      await setDoc(
        doc(
          db!,
          "users",
          profile.uid
        ),
        {
          displayName: name,
        },
        {
          merge: true,
        }
      );

      await refreshProfile();

      setAccountStatus(
        "Account details saved."
      );
    } catch (error) {
      console.error(
        "Failed to save account details:",
        error
      );

      setAccountStatus(
        error instanceof Error
          ? error.message
          : "Failed to save account details."
      );
    } finally {
      setAccountSaving(false);
    }
  }

  /*
   * Invite team member.
   */
  async function handleInviteMember() {
    if (!user || !business?.id) {
      setInviteError(
        "You must be signed in and have a business before inviting a member."
      );
      return;
    }

    const email =
      inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteError(
        "Please enter an email address."
      );
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setInviteUrl("");
    setInviteCopied(false);

    try {
      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/team/invite",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              businessId:
                business.id,
              email,
              role: inviteRole,
            }),
          }
        );

      const data =
        (await response.json()) as {
          error?: string;
          message?: string;
          invitationUrl?: string;
          inviteUrl?: string;
          emailSent?: boolean;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to create invitation."
        );
      }

      const createdInviteUrl =
        data.invitationUrl ??
        data.inviteUrl ??
        "";

      setInviteUrl(
        createdInviteUrl
      );

      setInviteEmail("");

      if (
        data.emailSent === false
      ) {
        setInviteError(
          "Invitation created, but the email could not be sent. You can copy the invitation link below."
        );
      }
    } catch (error) {
      console.error(
        "Failed to create invitation:",
        error
      );

      setInviteError(
        error instanceof Error
          ? error.message
          : "Failed to create invitation."
      );
    } finally {
      setInviteLoading(false);
    }
  }

  /*
   * Copy invitation link.
   */
  async function copyInviteLink() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setInviteCopied(true);

      window.setTimeout(() => {
        setInviteCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy invitation link:",
        error
      );

      setInviteError(
        "Could not copy the invitation link. Please copy it manually."
      );
    }
  }

  /*
   * Export business data as a readable PDF.
   */
  async function exportBusinessData() {
    if (!business) {
      return;
    }

    try {
      const { jsPDF } = await import(
        "jspdf"
      );

      const pdf = new jsPDF();

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      let y = 20;

      const formatDate = (
        value: string | number | undefined
      ) => {
        if (!value) {
          return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return String(value);
        }

        return date.toLocaleString("en-NG");
      };

      const formatMoney = (
        value: number
      ) => {
        return `${business.currency} ${toMajor(
          value
        ).toLocaleString("en-NG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      const ensureSpace = (
        requiredSpace: number
      ) => {
        if (
          y + requiredSpace >
          pageHeight - 20
        ) {
          pdf.addPage();
          y = 20;
        }
      };

      const addHeading = (
        text: string
      ) => {
        ensureSpace(15);

        pdf.setFontSize(14);
        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.text(
          text,
          15,
          y
        );

        y += 9;

        pdf.setFont(
          "helvetica",
          "normal"
        );
      };

      const addLine = (
        label: string,
        value: string
      ) => {
        ensureSpace(9);

        pdf.setFontSize(10);
        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.text(
          `${label}:`,
          15,
          y
        );

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.text(
          value,
          55,
          y
        );

        y += 6;
      };

      const addText = (
        text: string
      ) => {
        ensureSpace(8);

        pdf.setFontSize(9);
        pdf.setFont(
          "helvetica",
          "normal"
        );

        const lines =
          pdf.splitTextToSize(
            text,
            pageWidth - 30
          );

        pdf.text(
          lines,
          15,
          y
        );

        y +=
          lines.length * 5 + 3;
      };

      // TITLE
      pdf.setFontSize(20);
      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        "Business Data Report",
        15,
        y
      );

      y += 12;

      pdf.setFontSize(11);
      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        business.name,
        15,
        y
      );

      y += 7;

      pdf.setFontSize(9);

      pdf.text(
        `Generated: ${formatDate(
          Date.now()
        )}`,
        15,
        y
      );

      y += 12;

      // BUSINESS OVERVIEW
      addHeading(
        "Business Overview"
      );

      addLine(
        "Business",
        business.name
      );

      addLine(
        "Currency",
        business.currency
      );

      addLine(
        "Plan",
        planMeta(
          business.plan
        ).name
      );

      addLine(
        "Created",
        formatDate(
          business.createdAt
        )
      );

      y += 5;

      // DATA SUMMARY
      addHeading(
        "Data Summary"
      );

      addLine(
        "Accounts",
        String(accounts.length)
      );

      addLine(
        "Categories",
        String(categories.length)
      );

      addLine(
        "Vendors & Customers",
        String(vendors.length)
      );

      addLine(
        "Transactions",
        String(
          transactions.length
        )
      );

      addLine(
        "Recurring Transactions",
        String(
          recurring.length
        )
      );

      addLine(
        "Alerts",
        String(alerts.length)
      );

      y += 5;

      // ACCOUNTS
      addHeading("Accounts");

      if (
        accounts.length === 0
      ) {
        addText(
          "No accounts found."
        );
      } else {
        accounts.forEach(
          (account) => {
            addLine(
              account.name,
              `${
                account.type
              } — Opening balance: ${formatMoney(
                account.openingBalance
              )}`
            );
          }
        );
      }

      y += 5;

      // VENDORS & CUSTOMERS
      addHeading(
        "Vendors & Customers"
      );

      if (
        vendors.length === 0
      ) {
        addText(
          "No vendors or customers found."
        );
      } else {
        vendors.forEach(
          (vendor) => {
            addLine(
              vendor.name,
              vendor.kind ===
                "customer"
                ? "Customer"
                : "Supplier"
            );
          }
        );
      }

      y += 5;

      // CATEGORIES
      addHeading(
        "Categories"
      );

      if (
        categories.length === 0
      ) {
        addText(
          "No categories found."
        );
      } else {
        categories.forEach(
          (category) => {
            addLine(
              category.name,
              category.type ===
                "income"
                ? "Income"
                : "Expense"
            );
          }
        );
      }

      y += 5;

      // TRANSACTIONS
      addHeading(
        "Transactions"
      );

      if (
        transactions.length === 0
      ) {
        addText(
          "No transactions found."
        );
      } else {
        transactions.forEach(
          (transaction) => {
            ensureSpace(25);

            pdf.setFontSize(9);
            pdf.setFont(
              "helvetica",
              "bold"
            );

            pdf.text(
              `${formatDate(
                transaction.date
              )} — ${
                transaction.type
              }`,
              15,
              y
            );

            y += 5;

            pdf.setFont(
              "helvetica",
              "normal"
            );

            pdf.text(
              `Amount: ${formatMoney(
                transaction.amount
              )}`,
              15,
              y
            );

            y += 5;

            pdf.text(
              `Status: ${
                transaction.status
              }`,
              15,
              y
            );

            y += 5;

            if (
              transaction.categoryId
            ) {
              pdf.text(
                `Category ID: ${transaction.categoryId}`,
                15,
                y
              );

              y += 5;
            }

            if (
              transaction.vendorId
            ) {
              pdf.text(
                `Vendor ID: ${transaction.vendorId}`,
                15,
                y
              );

              y += 5;
            }

            if (
              transaction.notes
            ) {
              const lines =
                pdf.splitTextToSize(
                  `Notes: ${transaction.notes}`,
                  pageWidth - 30
                );

              pdf.text(
                lines,
                15,
                y
              );

              y +=
                lines.length * 5;
            }

            y += 4;
          }
        );
      }

      y += 5;

      // RECURRING TRANSACTIONS
      addHeading(
        "Recurring Transactions"
      );

      if (
        recurring.length === 0
      ) {
        addText(
          "No recurring transactions found."
        );
      } else {
        recurring.forEach(
          (rule) => {
            addLine(
              "Recurring transaction",
              `${rule.type} — ${formatMoney(
                rule.amount
              )} — ${rule.frequency}`
            );

            addText(
              `Start date: ${
                rule.startDate
              } | Next due: ${
                rule.nextDueDate
              } | ${
                rule.active
                  ? "Active"
                  : "Inactive"
              }`
            );

            if (
              rule.notes
            ) {
              addText(
                `Notes: ${rule.notes}`
              );
            }
          }
        );
      }

      y += 5;

      // ALERTS
      addHeading("Alerts");

      if (
        alerts.length === 0
      ) {
        addText(
          "No alerts found."
        );
      } else {
        alerts.forEach(
          (alert) => {
            addLine(
              alert.title,
              `${
                alert.severity
              } — ${
                alert.dismissed
                  ? "Dismissed"
                  : "Active"
              }`
            );

            addText(
              alert.message
            );

            if (alert.date) {
              addText(
                `Date: ${alert.date}`
              );
            }
          }
        );
      }

      // PAGE NUMBERS
      const pageCount =
        pdf.getNumberOfPages();

      for (
        let page = 1;
        page <= pageCount;
        page++
      ) {
        pdf.setPage(page);

        pdf.setFontSize(8);
        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.text(
          `Cashflow Copilot — Business Data Report — Page ${page} of ${pageCount}`,
          15,
          pageHeight - 10
        );
      }

      // DOWNLOAD
      const safeName =
        business.name
          .trim()
          .replace(
            /[^a-z0-9]+/gi,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )
          .toLowerCase();

      pdf.save(
        `${
          safeName || "business"
        }-business-report.pdf`
      );
    } catch (error) {
      console.error(
        "Failed to export business data:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to export business data."
      );
    }
  }

  /*
   * Save business details.
   */
  async function saveDetails(
    e?: React.FormEvent
  ) {
    e?.preventDefault();

    if (
      !business?.id ||
      !profile
    ) {
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      await setDoc(
        doc(
          db!,
          "businesses",
          business.id
        ),
        {
          name: businessName.trim(),
        },
        {
          merge: true,
        }
      );

      await setDoc(
        doc(
          db!,
          "users",
          profile.uid
        ),
        {
          currency,
        },
        {
          merge: true,
        }
      );

      await refreshProfile();
      await reload();

      setStatus("Saved.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Failed to save."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Save notification settings.
   */
  async function saveNotifications(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!profile) {
      return;
    }

    setNotificationSaving(true);
    setNotificationStatus(null);

    try {
      await setDoc(
        doc(
          db!,
          "users",
          profile.uid
        ),
        {
          lowBalanceThreshold:
            toMinor(
              threshold || "0"
            ),
        },
        {
          merge: true,
        }
      );

      await refreshProfile();

      setNotificationStatus(
        "Notification settings saved."
      );
    } catch (error) {
      setNotificationStatus(
        error instanceof Error
          ? error.message
          : "Failed to save notification settings."
      );
    } finally {
      setNotificationSaving(false);
    }
  }

  /*
   * Add password to the current
   * Firebase account.
   */
  async function setPassword(
  e: React.FormEvent
) {
  e.preventDefault();

  if (!user) {
    return;
  }

  setPasswordStatus(null);

  if (!newPassword) {
    setPasswordStatus("Please enter a new password.");
    return;
  }

  if (newPassword.length < 6) {
    setPasswordStatus(
      "Password must be at least 6 characters."
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordStatus(
      "Passwords do not match."
    );
    return;
  }

  setPasswordSaving(true);

  try {
    await updatePassword(
  user,
  newPassword
);

    setNewPassword("");
    setConfirmPassword("");

    setPasswordStatus(
      "Password changed successfully."
    );
  } catch (err) {
    console.error(
      "Failed to add password:",
      err
    );

    const code =
      err instanceof Error &&
      "code" in err
        ? (
            err as Error & {
              code?: string;
            }
          ).code
        : undefined;

    switch (code) {
      case "auth/provider-already-linked":
        setPasswordStatus(
          "Email/password is already linked to your account."
        );
        break;

      case "auth/requires-recent-login":
        setPasswordStatus(
          "For security, please sign in again before changing your password."
        );
        break;

      case "auth/weak-password":
        setPasswordStatus(
          "That password is too weak. Please choose a stronger password."
        );
        break;

      default:
        setPasswordStatus(
          err instanceof Error
            ? err.message
            : "Failed to change password."
        );
    }
  } finally {
    setPasswordSaving(false);
  }
}

async function sendVerification() {
  if (!user) {
    return;
  }

  setVerificationStatus(null);
  setVerificationSending(true);

  try {
    await sendEmailVerification(user);

    setVerificationStatus(
      "Verification email sent. Check your inbox and follow the link."
    );
  } catch (err) {
    console.error(
      "Failed to send verification email:",
      err
    );

    const code =
      err instanceof Error &&
      "code" in err
        ? (
            err as Error & {
              code?: string;
            }
          ).code
        : undefined;

    switch (code) {
      case "auth/too-many-requests":
        setVerificationStatus(
          "Too many verification emails have been requested. Please try again later."
        );
        break;

      case "auth/requires-recent-login":
        setVerificationStatus(
          "Please sign in again before requesting a verification email."
        );
        break;

      default:
        setVerificationStatus(
          err instanceof Error
            ? err.message
            : "Failed to send verification email."
        );
    }
  } finally {
    setVerificationSending(false);
  }
}

async function signOutAllDevices() {
  if (!user) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to sign out of all devices? You will need to sign in again on this device."
  );

  if (!confirmed) {
    return;
  }

  try {
    const token = await user.getIdToken();

    const response = await fetch(
      "/api/auth/revoke-sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to sign out of all devices."
      );
    }

    if (auth) {
      await auth.signOut();
    }
  } catch (err) {
    console.error(
      "Failed to sign out of all devices:",
      err
    );

    setVerificationStatus(
      err instanceof Error
        ? err.message
        : "Failed to sign out of all devices."
    );
  }
}
  /*
   * Add vendor/customer.
   */
  async function addVendor(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!business?.id) {
      return;
    }

    setVendorError(null);

    if (!vendorName.trim()) {
      setVendorError(
        "Enter a name."
      );
      return;
    }

    try {
      await createOne(
        business.id,
        "vendors",
        {
          businessId:
            business.id,
          name: vendorName.trim(),
          kind: vendorKind,
        }
      );

      setVendorName("");

      await reload();
    } catch (error) {
      setVendorError(
        error instanceof Error
          ? error.message
          : "Failed to add vendor or customer."
      );
    }
  }

  /*
   * Remove vendor/customer.
   */
  async function removeVendor(
    id: string
  ) {
    if (!business?.id) {
      return;
    }

    try {
      await removeOne(
        business.id,
        "vendors",
        id
      );

      await reload();
    } catch (error) {
      setVendorError(
        error instanceof Error
          ? error.message
          : "Failed to remove vendor or customer."
      );
    }
  }

  /*
   * Start subscription upgrade.
   */
  async function startUpgrade(
    plan: Exclude<PlanId, null>
  ) {
    if (
      !business?.id ||
      !user
    ) {
      return;
    }

    setUpgrading(plan);
    setPlanNotice(null);

    try {
      const token =
        await user.getIdToken();

      const res =
        await fetch(
          "/api/paystack/init",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              businessId:
                business.id,
              plan,
            }),
          }
        );

      const data =
        (await res.json()) as {
          error?: string;
          mode?: string;
          authorizationUrl?: string;
        };

      if (!res.ok) {
        throw new Error(
          data.error ??
            "Failed to start upgrade."
        );
      }

      if (
        data.mode === "paystack" &&
        data.authorizationUrl
      ) {
        window.location.href =
          data.authorizationUrl;
        return;
      }

      await reload();

      setPlanNotice(
        `You're on the ${planMeta(plan).name} plan now.`
      );
    } catch (error) {
      setPlanNotice(
        error instanceof Error
          ? error.message
          : "Failed to upgrade."
      );
    } finally {
      setUpgrading(null);
    }
  }

  const settingsItems: Array<{
    id: SettingsSection;
    label: string;
    icon: ComponentType<{
      className?: string;
    }>;
  }> = [
    {
      id: "account",
      label: "Account",
      icon: UserCircle,
    },
    {
      id: "business",
      label: "Business",
      icon: Building2,
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
    },
    {
      id: "privacy",
      label: "Data & Privacy",
      icon: Database,
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: Crown,
    },
    {
      id: "faq",
      label: "FAQ",
      icon: CircleHelp,
    },
  ];

  const faqItems = [
    {
      question:
        "How do I add a transaction?",
      answer:
        "Open Transactions from the main navigation and use the add transaction button to record income or expenses.",
    },
    {
      question:
        "How do I invite a team member?",
      answer:
        "Open Settings, select Business, then use the Team & Roles section to create an invitation.",
    },
    {
      question:
        "How do subscriptions work?",
      answer:
        "Open Settings and select Subscription to view the available plans and start an upgrade through Paystack.",
    },
    {
      question:
        "Where can I manage my business currency?",
      answer:
        "Open Settings, select Business, choose your preferred currency and save the changes.",
    },
    {
      question:
        "How do I add vendors or customers?",
      answer:
        "Open Settings, select Business, then use the Vendors & Customers section.",
    },
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and business preferences."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* SETTINGS NAVIGATION */}
        <Card className="h-fit text-zinc-900 dark:text-zinc-100">
          <div className="p-2">
            <nav className="space-y-1">
              {settingsItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    activeSection ===
                    item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setActiveSection(
                          item.id
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-primary text-white"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />

                      <span>
                        {item.label}
                      </span>
                    </button>
                  );
                }
              )}
            </nav>
          </div>
        </Card>

        {/* SETTINGS CONTENT */}
        <div className="min-w-0 text-zinc-900 dark:text-zinc-100">

          {/* ACCOUNT */}
          {activeSection ===
            "account" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Account information
                  </CardTitle>
                </CardHeader>

                <form
                  onSubmit={
                    saveAccount
                  }
                  className="space-y-5 p-6 pt-0"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Display name
                    </label>

                    <Input
                      value={
                        displayName
                      }
                      onChange={(e) =>
                        setDisplayName(
                          e.target.value
                        )
                      }
                      placeholder="Enter your name"
                    />

                    <p className="text-xs text-muted-foreground">
                      This is the name displayed on your account.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email address
                    </label>

                    <Input
                      value={
                        user?.email ??
                        ""
                      }
                      disabled
                      readOnly
                    />

                    <p className="text-xs text-muted-foreground">
                      Your email address is managed by your authentication provider.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Business role
                    </label>

                    <Input
                      value={
                        role
                          ? role
                              .charAt(
                                0
                              )
                              .toUpperCase() +
                            role.slice(
                              1
                            )
                          : "Member"
                      }
                      disabled
                      readOnly
                    />
                  </div>

                  {accountStatus && (
                    <p className="text-sm text-muted-foreground">
                      {
                        accountStatus
                      }
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      accountSaving
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />

                    {accountSaving
                      ? "Saving..."
                      : "Save changes"}
                  </Button>
                </form>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Account overview
                  </CardTitle>
                </CardHeader>

                <div className="grid gap-4 p-6 pt-0 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Signed-in email
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {user?.email ??
                        "Not available"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Current role
                    </p>

                    <p className="mt-1 text-sm font-medium capitalize">
                      {role ??
                        "Member"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Business
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {business?.name ??
                        "No business selected"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* BUSINESS */}
          {activeSection ===
            "business" && (
            <div className="space-y-6">

              {/* BUSINESS DETAILS */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Business details
                  </CardTitle>
                </CardHeader>

                <form
                  onSubmit={
                    saveDetails
                  }
                  className="space-y-5 p-6 pt-0"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Business name
                    </label>

                    <Input
                      value={
                        businessName
                      }
                      onChange={(e) =>
                        setBusinessName(
                          e.target.value
                        )
                      }
                      placeholder="Business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Currency
                    </label>

                    <Select
                      value={currency}
                      onChange={(e) =>
                        setCurrency(
                          e.target.value
                        )
                      }
                      options={CURRENCIES.map(
                        (item) => ({
                          value:
                            item.code,
                          label: `${item.code} — ${item.label}`,
                        })
                      )}
                    />
                  </div>

                  {status && (
                    <p className="text-sm text-muted-foreground">
                      {status}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      saving
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />

                    {saving
                      ? "Saving..."
                      : "Save changes"}
                  </Button>
                </form>
              </Card>

              {/* TEAM & ROLES */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team & Roles
                    </CardTitle>

                    {(role ===
                      "owner" ||
                      role ===
                        "manager") && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setInviteOpen(
                            !inviteOpen
                          );

                          setInviteError(
                            ""
                          );

                          setInviteUrl(
                            ""
                          );
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Invite member
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <div className="space-y-4 p-6 pt-0">

                  {/* CURRENT USER / OWNER */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div>
                          <p className="text-sm font-medium">
                            {user?.email ??
                              "Current user"}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {role ===
                            "owner"
                              ? "Business owner"
                              : "Current account"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        {role ??
                          "member"}
                      </span>
                    </div>
                  </div>

                  {/* TEAM MEMBERS */}
                  {(role ===
                    "owner" ||
                    role ===
                      "manager") && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-medium">
                          Team members
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          Members who have access to this business.
                        </p>
                      </div>

                      {members.length ===
                      0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <Users className="mx-auto h-8 w-8 text-muted-foreground" />

                          <p className="mt-2 text-sm font-medium">
                            No team members yet
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Invite a staff member or manager to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {members.map(
                            (member) => (
                              <div
                                key={
                                  member.uid
                                }
                                className="flex items-center justify-between gap-4 rounded-lg border p-4"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium">
                                      {member.email || member.uid}
                                  
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {member.status ===
                                      "active"
                                        ? "Active member"
                                        : member.status}
                                    </p>
                                  </div>
                                </div>

                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                  {
                                    member.role
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* INVITATION FORM */}
                  {inviteOpen &&
                    (role ===
                      "owner" ||
                      role ===
                        "manager") && (
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Email address
                            </label>

                            <Input
                              type="email"
                              value={
                                inviteEmail
                              }
                              onChange={(
                                e
                              ) =>
                                setInviteEmail(
                                  e
                                    .target
                                    .value
                                )
                              }
                              placeholder="member@example.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Role
                            </label>

                            <Select
                              value={
                                inviteRole
                              }
                              onChange={(
                                e
                              ) =>
                                setInviteRole(
                                  e
                                    .target
                                    .value as
                                    | "manager"
                                    | "staff"
                                )
                              }
                              options={[
                                {
                                  value:
                                    "staff",
                                  label:
                                    "Staff",
                                },
                                {
                                  value:
                                    "manager",
                                  label:
                                    "Manager",
                                },
                              ]}
                            />
                          </div>
                        </div>

                        {inviteError && (
                          <p className="text-sm text-destructive">
                            {
                              inviteError
                            }
                          </p>
                        )}

                        <Button
                          type="button"
                          onClick={
                            handleInviteMember
                          }
                          disabled={
                            inviteLoading
                          }
                        >
                          {inviteLoading
                            ? "Creating invitation..."
                            : "Create invitation"}
                        </Button>

                        {inviteUrl && (
                          <div className="space-y-3 rounded-lg bg-muted p-4">
                            <p className="text-sm font-medium">
                              Invitation
                              link
                            </p>

                            <a
                              href={
                                inviteUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="block break-all text-sm text-primary underline"
                            >
                              {
                                inviteUrl
                              }
                            </a>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={
                                copyInviteLink
                              }
                            >
                              <Check className="mr-2 h-4 w-4" />

                              {inviteCopied
                                ? "Copied!"
                                : "Copy link"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </Card>

              {/* VENDORS & CUSTOMERS */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Vendors & Customers
                  </CardTitle>
                </CardHeader>

                <div className="space-y-5 p-6 pt-0">
                  <form
                    onSubmit={
                      addVendor
                    }
                    className="grid gap-3 sm:grid-cols-[1fr_180px_auto]"
                  >
                    <Input
                      value={
                        vendorName
                      }
                      onChange={(e) =>
                        setVendorName(
                          e.target.value
                        )
                      }
                      placeholder="Name"
                    />

                    <Select
                      value={
                        vendorKind
                      }
                      onChange={(e) =>
                        setVendorKind(
                          e.target
                            .value as VendorKind
                        )
                      }
                      options={[
                        {
                          value:
                            "supplier",
                          label:
                            "Supplier",
                        },
                        {
                          value:
                            "customer",
                          label:
                            "Customer",
                        },
                      ]}
                    />

                    <Button type="submit">
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </form>

                  {vendorError && (
                    <p className="text-sm text-destructive">
                      {vendorError}
                    </p>
                  )}

                  <div className="space-y-2">
                    {vendors.length ===
                    0 ? (
                      <p className="text-sm text-muted-foreground">
                        No vendors or customers added yet.
                      </p>
                    ) : (
                      vendors.map(
                        (vendor) => (
                          <div
                            key={
                              vendor.id
                            }
                            className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {
                                  vendor.name
                                }
                              </p>

                              <p className="text-xs capitalize text-muted-foreground">
                                {
                                  vendor.kind
                                }
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                removeVendor(
                                  vendor.id
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </Card>

              {/* ACCOUNTS */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Accounts
                  </CardTitle>
                </CardHeader>

                <div className="space-y-2 p-6 pt-0">
                  {accounts.length ===
                  0 ? (
                    <p className="text-sm text-muted-foreground">
                      No accounts added yet.
                    </p>
                  ) : (
                    accounts.map(
                      (account) => (
                        <div
                          key={
                            account.id
                          }
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {
                                account.name
                              }
                            </p>

                            <p className="text-xs capitalize text-muted-foreground">
                              {
                                account.type
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* SECURITY */}
          {activeSection ===
            "security" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LockKeyhole className="h-5 w-5" />
                    Login & Security
                  </CardTitle>
                </CardHeader>

                <form
                  onSubmit={
                    setPassword
                  }
                  className="space-y-5 p-6 pt-0"
                >
                  <p className="text-sm text-muted-foreground">
                    Change your account password. For security, you may be asked to sign in again before changing it.
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      New password
                    </label>

                    <Input
                      type="password"
                      value={
                        newPassword
                      }
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Confirm password
                    </label>

                    <Input
                      type="password"
                      value={
                        confirmPassword
                      }
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder="Confirm your password"
                    />
                  </div>

                  {passwordStatus && (
                    <p className="text-sm text-muted-foreground">
                      {
                        passwordStatus
                      }
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      passwordSaving
                    }
                  >
                    <Shield className="mr-2 h-4 w-4" />

                    {passwordSaving
                      ? "Changing password..."
                      : "Change password"}
                  </Button>
                </form>
                   </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Email Verification
          </CardTitle>
        </CardHeader>

        <div className="space-y-4 p-6 pt-0">
          <div>
            <p className="text-sm font-medium">
              {user?.email}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {user?.emailVerified
                ? "Your email address is verified."
                : "Your email address is not verified."}
            </p>
          </div>

          {!user?.emailVerified && (
            <>
              <Button
                type="button"
                onClick={sendVerification}
                disabled={verificationSending}
              >
                <Shield className="mr-2 h-4 w-4" />

                {verificationSending
                  ? "Sending..."
                  : "Send verification email"}
              </Button>

              {verificationStatus && (
                <p className="text-sm text-muted-foreground">
                  {verificationStatus}
                </p>
              )}
            </>
          )}

          {user?.emailVerified && (
            <p className="text-sm font-medium text-green-600">
              ✓ Email verified
            </p>
          )}
        </div>
      </Card>
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <LockKeyhole className="h-5 w-5" />
            Sign Out of All Devices
          </CardTitle>
        </CardHeader>

        <div className="space-y-4 p-6 pt-0">
          <p className="text-sm text-muted-foreground">
            This will sign your account out of all devices,
            including this device. You will need to sign in
            again.
          </p>

          <Button
            type="button"
            onClick={signOutAllDevices}
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            Sign out of all devices
          </Button>
        </div>
      </Card>
    </div>
  )}

          {/* NOTIFICATIONS */}
          {activeSection ===
            "notifications" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>

                <form
                  onSubmit={
                    saveNotifications
                  }
                  className="space-y-5 p-6 pt-0"
                >
                  <p className="text-sm text-muted-foreground">
                    Configure when your account should warn you about low balances.
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Low-balance alert threshold
                    </label>

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        threshold
                      }
                      onChange={(e) =>
                        setThreshold(
                          e.target.value
                        )
                      }
                    />

                    <p className="text-xs text-muted-foreground">
                      You can change this amount at any time.
                    </p>
                  </div>

                  {notificationStatus && (
                    <p className="text-sm text-muted-foreground">
                      {
                        notificationStatus
                      }
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      notificationSaving
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />

                    {notificationSaving
                      ? "Saving..."
                      : "Save notification settings"}
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* APPEARANCE */}
          {activeSection ===
            "appearance" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                </CardHeader>

                <div className="space-y-5 p-6 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Choose how Cashflow Copilot should appear on your device.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        value:
                          "system" as const,
                        label: "System",
                        description:
                          "Follow your device setting.",
                      },
                      {
                        value:
                          "light" as const,
                        label: "Light",
                        description:
                          "Use the light appearance.",
                      },
                      {
                        value:
                          "dark" as const,
                        label: "Dark",
                        description:
                          "Use the dark appearance.",
                      },
                    ].map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setTheme(
                              option.value
                            )
                          }
                          className={`rounded-lg border p-4 text-left transition ${
                            theme ===
                            option.value
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {
                                option.label
                              }
                            </span>

                            {theme ===
                              option.value && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            {
                              option.description
                            }
                          </p>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* DATA & PRIVACY */}
          {activeSection ===
            "privacy" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data & Privacy
                  </CardTitle>
                </CardHeader>

                <div className="space-y-5 p-6 pt-0">
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium">
                      Your business data
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Your business information, transactions, accounts, vendors and related records are stored in your application database.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium">
                      Data export
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Export your business information and records as a readable PDF report.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={
                        exportBusinessData
                      }
                      disabled={!business}
                    >
                      Export data
                    </Button>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium">
                      Account deletion
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Account and business deletion controls will be provided here when the deletion workflow is implemented.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      disabled
                    >
                      Delete account
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SUBSCRIPTION */}
          {activeSection ===
            "subscription" && (
            <div
              id="subscription"
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Plan & Billing
                  </CardTitle>
                </CardHeader>

                <div className="space-y-5 p-6 pt-0">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Current plan
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {
                        current.name
                      }
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        current.tagline
                      }
                    </p>
                  </div>

                  {planNotice && (
                    <p className="rounded-lg border p-4 text-sm">
                      {planNotice}
                    </p>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {PLANS.filter(
                      (plan) =>
                        plan.id !==
                        "free"
                    ).map(
                      (plan) => {
                        const isCurrent =
                          plan.id ===
                          business?.plan;

                        return (
                          <div
                            key={
                              plan.id
                            }
                            className={`rounded-xl border p-5 ${
                              isCurrent
                                ? "border-primary"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold">
                                  {
                                    plan.name
                                  }
                                </h3>

                                <p className="mt-1 text-sm text-muted-foreground">
                                  {
                                    plan.tagline
                                  }
                                </p>
                              </div>

                              {isCurrent && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                  Current
                                </span>
                              )}
                            </div>

                            <p className="mt-5 text-2xl font-bold">
                              {formatPrice(
                                plan
                              )}
                            </p>

                            <ul className="mt-5 space-y-2">
                              {plan.features.map(
                                (
                                  feature
                                ) => (
                                  <li
                                    key={
                                      feature
                                    }
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                                    <span>
                                      {
                                        feature
                                      }
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>

                            <Button
                              type="button"
                              className="mt-6 w-full"
                              variant={
                                isCurrent
                                  ? "outline"
                                  : "primary"
                              }
                              disabled={
                                isCurrent ||
                                upgrading ===
                                  plan.id
                              }
                              onClick={() =>
                                startUpgrade(
                                  plan.id
                                )
                              }
                            >
                              {isCurrent
                                ? "Current plan"
                                : upgrading ===
                                    plan.id
                                  ? "Processing..."
                                  : `Upgrade to ${plan.name}`}
                            </Button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* FAQ */}
          {activeSection ===
            "faq" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleHelp className="h-5 w-5" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>

                <div className="divide-y p-6 pt-0">
                  {faqItems.map(
                    (faq, index) => {
                      const open =
                        openFaq ===
                        index;

                      return (
                        <div
                          key={
                            faq.question
                          }
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenFaq(
                                open
                                  ? null
                                  : index
                              )
                            }
                            className="flex w-full items-center justify-between gap-4 text-left"
                          >
                            <span className="text-sm font-medium">
                              {
                                faq.question
                              }
                            </span>

                            <span className="text-lg text-muted-foreground">
                              {open
                                ? "−"
                                : "+"}
                            </span>
                          </button>

                          {open && (
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                              {
                                faq.answer
                              }
                            </p>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}