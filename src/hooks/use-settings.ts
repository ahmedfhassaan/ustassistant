import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AssistantSettings {
  assistant_name: string;
  welcome_message: string;
  tone: string;
  max_response_length: string;
  show_sources: string;
  fallback_message: string;
  strict_sources: string;
  cache_enabled: string;
  cache_ttl_minutes: string;
  auto_clear_cache: string;
  admin_password: string;
  max_messages_per_day: string;
  abuse_protection: string;
  search_results_count: string;
  ai_model: string;
  confidence_threshold: string;
  low_confidence_message: string;
  custom_instruction: string;
  admin_student_id: string;
  // RAG tuning
  chunk_size: string;
  chunk_overlap: string;
  enable_query_rewriting: string;
  enable_reranking: string;
  initial_results_count: string;
  final_results_count: string;
  weight_text_default: string;
  weight_semantic_default: string;
  weight_text_exact: string;
  weight_text_semantic_lean: string;
  semantic_cache_threshold: string;
  [key: string]: string;
}

const DEFAULTS: AssistantSettings = {
  assistant_name: "المساعد الجامعي الذكي",
  welcome_message: "كيف يمكنني مساعدتك اليوم؟",
  tone: "professional",
  max_response_length: "1000",
  show_sources: "true",
  fallback_message: "عذراً، لم أجد معلومات مؤكدة حول هذا السؤال. يرجى التواصل مع الجهة المختصة في الجامعة.",
  strict_sources: "false",
  cache_enabled: "true",
  cache_ttl_minutes: "1440",
  auto_clear_cache: "true",
  admin_password: "admin123",
  max_messages_per_day: "100",
  abuse_protection: "true",
  search_results_count: "5",
  ai_model: "google/gemini-3-flash-preview",
  confidence_threshold: "30",
  low_confidence_message: "لا توجد معلومة مؤكدة حول هذا الموضوع. يرجى مراجعة الجهة المختصة.",
  custom_instruction: "",
  admin_student_id: "20260000",
  // RAG tuning defaults
  chunk_size: "280",
  chunk_overlap: "50",
  enable_query_rewriting: "false",
  enable_reranking: "false",
  initial_results_count: "10",
  final_results_count: "5",
  weight_text_default: "0.4",
  weight_semantic_default: "0.6",
  weight_text_exact: "0.65",
  weight_text_semantic_lean: "0.3",
};

export function useSettings() {
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistant_settings")
        .select("key, value");
      if (error) throw error;
      if (data) {
        const map = { ...DEFAULTS };
        data.forEach((row: any) => {
          map[row.key] = row.value;
        });
        setSettings(map);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: AssistantSettings) => {
    const entries = Object.entries(newSettings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    // Upsert all settings
    for (const entry of entries) {
      const { error } = await supabase
        .from("assistant_settings")
        .upsert(entry, { onConflict: "key" });
      if (error) throw error;
    }

    setSettings(newSettings);
  };

  return { settings, loading, saveSettings, refetch: fetchSettings };
}
