import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch session on mount
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        setUser(data.session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchSession();

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}