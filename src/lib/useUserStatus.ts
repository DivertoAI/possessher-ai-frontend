"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function useUserStatus(userEmail: string | undefined) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!userEmail) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("email", userEmail)
        .single();

      if (data?.is_pro) setIsPro(true);
      setLoading(false);
    };

    fetchStatus();
  }, [userEmail]);

  return { isPro, loading };
}