"use server"

import { createClient } from "@supabase/supabase-js"

export async function fetchVocab() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase.from("vocab").select("*").order("idx")
  if (error) throw new Error(error.message)
  return data
}