export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import BuildLogApp from '@/components/BuildLogApp'
import { BuildLog } from '@/lib/supabase'

async function getInitialPosts(): Promise<BuildLog[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('build_logs')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function Home() {
  const initialPosts = await getInitialPosts()
  return <BuildLogApp initialPosts={initialPosts} />
}
