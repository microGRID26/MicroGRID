/**
 * GET /api/planset/drive-photos?projectId=PROJ-XXX
 *
 * Auto-pulls photos from a project's Google Drive folder for /planset image slots.
 * Scopes to "07 Site Survey" and "08 Design" subfolders. Classifies by filename
 * regex. Returns proxy URLs pointing at /api/planset/drive-image/[fileId].
 *
 * Falls back silently to null slots on any failure — /planset UI treats null as
 * "show upload placeholder" so there's zero regression when Drive is unavailable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { listFolderChildren, findSubfolder, type DriveFile } from '@/lib/google-drive'

interface PlansetPhotos {
  aerialPhotoUrl: string | null
  housePhotoUrl: string | null
  sitePlanImageUrl: string | null
  roofPlanImageUrl: string | null
  equipmentPhotos: (string | null)[]
  /** Non-fatal diagnostic — what was attempted, what matched, why empty */
  meta: {
    folderId: string | null
    subfoldersSearched: string[]
    filesListed: number
    imagesMatched: number
    fallbackReason?: string
    elapsedMs: number
  }
}

const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const SUBFOLDERS = ['07 Site Survey', '08 Design'] as const
const CACHE_TTL_MS = 5 * 60 * 1000

const classifiers = {
  aerial: /^(aerial|satellite|drone|overhead)/i,
  house: /^(house|front|elevation|property)/i,
  sitePlan: /^(site[ _-]?plan|layout|lot)/i,
  roofPlan: /^(roof[ _-]?plan|modules|string|subhub)/i,
  equipment: /^(equipment|inverter|battery|panel|wall)/i,
}

// In-memory cache — Vercel server instance scope. Keyed by projectId.
const cache = new Map<string, { value: PlansetPhotos; expiresAt: number }>()

function emptyResult(folderId: string | null, reason: string, started: number, filesListed = 0): PlansetPhotos {
  return {
    aerialPhotoUrl: null,
    housePhotoUrl: null,
    sitePlanImageUrl: null,
    roofPlanImageUrl: null,
    equipmentPhotos: [null, null, null, null],
    meta: {
      folderId,
      subfoldersSearched: [],
      filesListed,
      imagesMatched: 0,
      fallbackReason: reason,
      elapsedMs: Date.now() - started,
    },
  }
}

function proxyUrl(fileId: string): string {
  return `/api/planset/drive-image/${encodeURIComponent(fileId)}`
}

export async function GET(req: NextRequest) {
  const started = Date.now()

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await rateLimit(`planset-drive:${user.email}`, {
    windowMs: 60_000, max: 60, prefix: 'planset-drive',
  })
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Cache check
  const cached = cache.get(projectId)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value)
  }

  // Load project folder_id
  const queryResult = await supabase
    .from('projects')
    .select('id, folder_id')
    .eq('id', projectId)
    .maybeSingle()

  const project = queryResult.data as { id: string; folder_id: string | null } | null
  if (queryResult.error || !project) {
    return NextResponse.json(emptyResult(null, `project not found or not accessible`, started))
  }
  const folderId = project.folder_id
  if (!folderId) {
    const result = emptyResult(null, 'project has no folder_id', started)
    cache.set(projectId, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(result)
  }

  // Find subfolders and list their children in parallel
  const allFiles: DriveFile[] = []
  const subfoldersSearched: string[] = []
  try {
    const subfolderIds = await Promise.all(
      SUBFOLDERS.map(name => findSubfolder(folderId, name))
    )
    for (let i = 0; i < subfolderIds.length; i++) {
      const id = subfolderIds[i]
      if (!id) continue
      subfoldersSearched.push(SUBFOLDERS[i])
      const children = await listFolderChildren(id, 200)
      allFiles.push(...children)
    }
  } catch (err) {
    console.error('[drive-photos] listing failed:', err)
    return NextResponse.json(emptyResult(folderId, `drive listing failed: ${(err as Error).message}`, started))
  }

  // Filter to image MIMEs only
  const images = allFiles.filter(f => IMAGE_MIMES.has(f.mimeType))

  // Classify
  const result: PlansetPhotos = {
    aerialPhotoUrl: null,
    housePhotoUrl: null,
    sitePlanImageUrl: null,
    roofPlanImageUrl: null,
    equipmentPhotos: [],
    meta: {
      folderId,
      subfoldersSearched,
      filesListed: allFiles.length,
      imagesMatched: 0,
      elapsedMs: 0,
    },
  }

  let matched = 0
  const equipmentFound: string[] = []
  for (const img of images) {
    const base = img.name.replace(/\.[^.]+$/, '').trim()
    if (!result.aerialPhotoUrl && classifiers.aerial.test(base)) {
      result.aerialPhotoUrl = proxyUrl(img.id); matched++; continue
    }
    if (!result.housePhotoUrl && classifiers.house.test(base)) {
      result.housePhotoUrl = proxyUrl(img.id); matched++; continue
    }
    if (!result.sitePlanImageUrl && classifiers.sitePlan.test(base)) {
      result.sitePlanImageUrl = proxyUrl(img.id); matched++; continue
    }
    if (!result.roofPlanImageUrl && classifiers.roofPlan.test(base)) {
      result.roofPlanImageUrl = proxyUrl(img.id); matched++; continue
    }
    if (equipmentFound.length < 4 && classifiers.equipment.test(base)) {
      equipmentFound.push(proxyUrl(img.id)); matched++
    }
  }
  // Pad equipmentPhotos to length 4
  while (equipmentFound.length < 4) equipmentFound.push(null as unknown as string)
  result.equipmentPhotos = equipmentFound as (string | null)[]

  result.meta.imagesMatched = matched
  result.meta.elapsedMs = Date.now() - started

  cache.set(projectId, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return NextResponse.json(result)
}
