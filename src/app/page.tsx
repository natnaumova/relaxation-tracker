"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck, TrendingUp, History, Target, Moon, Briefcase, Smartphone, Sparkles } from "lucide-react"


type DailyLog = {
  date: string
  sleepHours: number
  workedAfter1930: boolean
  watchedReels: boolean
  didYoga: boolean
}

type Targets = {
  targetAvgSleep: number
  maxLateWorkNights: number
  maxReelsDays: number
  targetYogaDays: number

  labelAvgSleep: string
  labelLateWork: string
  labelReels: string
  labelYoga: string
}

type TabType = "check-in" | "this-week" | "history" | "targets"

type StatusBadge = "On track" | "At risk" | "Off track"

export default function RelaxationTracker() {
  const [activeTab, setActiveTab] = useState<TabType>("check-in")
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [targets, setTargets] = useState<Targets>({
    targetAvgSleep: 8,
    maxLateWorkNights: 2,
    maxReelsDays: 4,
    targetYogaDays: 7,
  
    labelAvgSleep: "Average Sleep",
    labelLateWork: "Late work nights",
    labelReels: "Reels days",
    labelYoga: "Yoga / meditation",
  })

  const [targetsDraft, setTargetsDraft] = useState({
    targetAvgSleep: "8",
    maxLateWorkNights: "2",
    maxReelsDays: "4",
    targetYogaDays: "7",
  })

  const [labelsDraft, setLabelsDraft] = useState({
    labelAvgSleep: "Target 1",
    labelLateWork: "Target 2",
    labelReels: "Target 3",
    labelYoga: "Target 4",
  })

  const [targetsMessage, setTargetsMessage] = useState<string | null>(null)
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [isSavingTargets, setIsSavingTargets] = useState(false)
  const [isBooting, setIsBooting] = useState(true)

  
  useEffect(() => {
    const load = async () => {
      try {
        const [
          { data: targetsRow, error: targetsError },
          { data: logsRows, error: logsError },
        ] = await Promise.all([
          supabase.from("targets").select("*").eq("singleton", true).maybeSingle(),
          supabase.from("logs").select("*").order("log_date", { ascending: true }),
        ])
  
        if (targetsError) console.error("Targets load failed:", targetsError)
        if (logsError) console.error("Logs load failed:", logsError)
  
          if (targetsRow) {
            setTargets((prev) => ({
              ...prev,
              targetAvgSleep: Number(targetsRow.target_avg_sleep),
              maxLateWorkNights: targetsRow.max_late_work_nights,
              maxReelsDays: targetsRow.max_reels_days,
              targetYogaDays: targetsRow.target_yoga_days,
          
              labelAvgSleep: targetsRow.label_avg_sleep ?? prev.labelAvgSleep,
              labelLateWork: targetsRow.label_late_work ?? prev.labelLateWork,
              labelReels: targetsRow.label_reels ?? prev.labelReels,
              labelYoga: targetsRow.label_yoga ?? prev.labelYoga,
            }))
          }
  
        if (logsRows) {
          setLogs(
            logsRows.map((r) => ({
              date: r.log_date,
              sleepHours: Number(r.sleep_hours),
              workedAfter1930: r.worked_after_1930,
              watchedReels: r.watched_reels,
              didYoga: r.did_yoga,
            }))
          )
        }
      } finally {
        setTimeout(() => setIsBooting(false), 350)
      }
    }
  
    load()
  }, [])
  
  
  useEffect(() => {
    setLabelsDraft({
      labelAvgSleep: targets.labelAvgSleep || "Target 1",
      labelLateWork: targets.labelLateWork || "Target 2",
      labelReels: targets.labelReels || "Target 3",
      labelYoga: targets.labelYoga || "Target 4",
    })
  }, [targets.labelAvgSleep, targets.labelLateWork, targets.labelReels, targets.labelYoga])

  useEffect(() => {
    setTargetsDraft({
      targetAvgSleep: String(targets.targetAvgSleep),
      maxLateWorkNights: String(targets.maxLateWorkNights),
      maxReelsDays: String(targets.maxReelsDays),
      targetYogaDays: String(targets.targetYogaDays),
    })
  }, [targets.targetAvgSleep, targets.maxLateWorkNights, targets.maxReelsDays, targets.targetYogaDays])
  
  // Form state
  const todayYMD = () => {
    return new Date().toISOString().split("T")[0]
  }

  const yesterdayYMD = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split("T")[0]
  }

  const [formDate, setFormDate] = useState(yesterdayYMD())
  const [sleepHours, setSleepHours] = useState(8)
  const SLEEP_MIN = 4
const SLEEP_MAX = 12
const SLEEP_STEP = 0.5

const formatSleep = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

const bumpSleep = (delta: number) => {
  setSleepHours((prev) => {
    // avoid float drift by working in "steps"
    const steps = Math.round(prev / SLEEP_STEP)
    const next = (steps + delta) * SLEEP_STEP
    return Math.min(SLEEP_MAX, Math.max(SLEEP_MIN, next))
  })
}

  const [workedAfter1930, setWorkedAfter1930] = useState(false)
  const [watchedReels, setWatchedReels] = useState(false)
  const [didYoga, setDidYoga] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)


  // Save log
  const handleSave = async () => {
    const isUpdate = logs.some((l) => l.date === formDate)

    setIsSavingLog(true)

    const newLog: DailyLog = {
      date: formDate,
      sleepHours,
      workedAfter1930,
      watchedReels,
      didYoga,
    }

    const { error } = await supabase.from("logs").upsert(
      {
        log_date: formDate,
        sleep_hours: sleepHours,
        worked_after_1930: workedAfter1930,
        watched_reels: watchedReels,
        did_yoga: didYoga,
      },
      { onConflict: "log_date" }
    )

    setIsSavingLog(false)

    if (error) {
      console.error("Save log failed:", error)
      setSaveMessage("Save failed")
      setTimeout(() => setSaveMessage(null), 2000)
      return
    }

    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === formDate)
      if (idx !== -1) {
        const copy = [...prev]
        copy[idx] = newLog
        return copy
      }
      return [...prev, newLog]
    })

    setSaveMessage(isUpdate ? "Updated ✓" : "Saved ✓")
    setTimeout(() => setSaveMessage(null), 2000)
  }

 

// Save targets
const handleSaveTargets = async () => {
  setIsSavingTargets(true)

  // If user clears an input, don't save 0 by accident.
  const numOr = (raw: string, fallback: number) => {
    const t = raw.trim()
    if (t === "") return fallback
    const n = Number(t)
    return Number.isNaN(n) ? fallback : n
  }

  const labelsToSave = {
    labelAvgSleep: labelsDraft.labelAvgSleep.trim() || "Target 1",
    labelLateWork: labelsDraft.labelLateWork.trim() || "Target 2",
    labelReels: labelsDraft.labelReels.trim() || "Target 3",
    labelYoga: labelsDraft.labelYoga.trim() || "Target 4",
  }

  const targetsToSave = {
    targetAvgSleep: numOr(targetsDraft.targetAvgSleep, targets.targetAvgSleep),
    maxLateWorkNights: numOr(targetsDraft.maxLateWorkNights, targets.maxLateWorkNights),
    maxReelsDays: numOr(targetsDraft.maxReelsDays, targets.maxReelsDays),
    targetYogaDays: numOr(targetsDraft.targetYogaDays, targets.targetYogaDays),
  }

  const { error } = await supabase.from("targets").upsert(
    {
      singleton: true,
      target_avg_sleep: targetsToSave.targetAvgSleep,
      max_late_work_nights: targetsToSave.maxLateWorkNights,
      max_reels_days: targetsToSave.maxReelsDays,
      target_yoga_days: targetsToSave.targetYogaDays,

      label_avg_sleep: labelsToSave.labelAvgSleep,
      label_late_work: labelsToSave.labelLateWork,
      label_reels: labelsToSave.labelReels,
      label_yoga: labelsToSave.labelYoga,
    },
    { onConflict: "singleton" }
  )

  setIsSavingTargets(false)

  if (error) {
    console.error("Save targets failed:", error)
    setTargetsMessage("Save failed")
    setTimeout(() => setTargetsMessage(null), 2000)
    return
  }

  // IMPORTANT: update BOTH numbers + labels in app state
  setTargets((prev) => ({
    ...prev,
    ...targetsToSave,
    ...labelsToSave,
  }))

  setTargetsMessage("Saved ✓")
  setTimeout(() => setTargetsMessage(null), 2000)
}


  // Load log for editing
  const loadLog = (log: DailyLog) => {
    setFormDate(log.date)
    setSleepHours(log.sleepHours)
    setWorkedAfter1930(log.workedAfter1930)
    setWatchedReels(log.watchedReels)
    setDidYoga(log.didYoga)
    setActiveTab("check-in")
  }

  // Get current week (Mon-Sun)
  const getCurrentWeek = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return { monday, sunday }
  }

  // Calculate week metrics
  const weekMetrics = useMemo(() => {
    const { monday, sunday } = getCurrentWeek()
    const mondayStr = monday.toISOString().split("T")[0]
    const sundayStr = sunday.toISOString().split("T")[0]

    const weekLogs = logs.filter((log) => {
      return log.date >= mondayStr && log.date <= sundayStr
    })

    const totalSleep = weekLogs.reduce((sum, log) => sum + log.sleepHours, 0)
    const avgSleep = weekLogs.length > 0 ? totalSleep / weekLogs.length : 0
    const lateWorkNights = weekLogs.filter((log) => log.workedAfter1930).length
    const reelsDays = weekLogs.filter((log) => log.watchedReels).length
    const yogaDays = weekLogs.filter((log) => log.didYoga).length

    // Calculate days remaining in week
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysRemaining = Math.max(0, Math.ceil((sunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    const weekEnded = today > sunday

    // Status calculations
    const getSleepStatus = (): StatusBadge => {
      if (weekEnded) {
        return avgSleep >= targets.targetAvgSleep ? "On track" : "Off track"
      }
      if (weekLogs.length === 0) return "On track"
      const requiredAvg = (targets.targetAvgSleep * 7 - totalSleep) / Math.max(1, daysRemaining)
      if (requiredAvg > 9) return "At risk"
      return avgSleep >= targets.targetAvgSleep ? "On track" : "On track"
    }

    const getLateWorkStatus = (): StatusBadge => {
      if (lateWorkNights > targets.maxLateWorkNights) return "Off track"
      if (lateWorkNights === targets.maxLateWorkNights && daysRemaining > 0) return "At risk"
      return "On track"
    }

    const getReelsStatus = (): StatusBadge => {
      if (reelsDays > targets.maxReelsDays) return "Off track"
      if (reelsDays === targets.maxReelsDays && daysRemaining > 0) return "At risk"
      return "On track"
    }

    const getYogaStatus = (): StatusBadge => {
      if (weekLogs.some((log) => !log.didYoga)) {
        const latestLog = [...weekLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
        if (latestLog && !latestLog.didYoga && !weekEnded) return "At risk"
        return "Off track"
      }
      return "On track"
    }

    return {
      avgSleep,
      lateWorkNights,
      reelsDays,
      yogaDays,
      sleepStatus: getSleepStatus(),
      lateWorkStatus: getLateWorkStatus(),
      reelsStatus: getReelsStatus(),
      yogaStatus: getYogaStatus(),
    }
  }, [logs, targets])

  // Render badge
  const renderBadge = (status: StatusBadge) => {
    const variant = status === "On track" ? "default" : status === "At risk" ? "secondary" : "destructive"
    return (
      <Badge variant={variant} className="text-xs">
        {status}
      </Badge>
    )
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  function StepperInput(props: {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    step?: number
    min?: number
    max?: number
  }) {
    const { id, label, value, onChange, step = 1, min, max } = props
  
    const clamp = (n: number) => {
      if (Number.isNaN(n)) return n
      if (typeof min === "number") n = Math.max(min, n)
      if (typeof max === "number") n = Math.min(max, n)
      return n
    }
  
    const bump = (delta: number) => {
      const current = value.trim() === "" ? 0 : Number(value)
      const next = clamp(current + delta)
      onChange(String(next))
    }
  
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
  
        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-12"
            onClick={() => bump(-step)}
            aria-label={`Decrease ${label}`}
          >
            –
          </Button>
  
          <Input
            id={id}
            value={value}
            inputMode="decimal"
            className="h-12 text-center text-base"
            onChange={(e) => {
              const next = e.target.value
              if (next === "") return onChange("")
              if (/^\d*\.?\d*$/.test(next)) onChange(next)
            }}
          />
  
          <Button
            type="button"
            variant="outline"
            className="h-12 w-12"
            onClick={() => bump(step)}
            aria-label={`Increase ${label}`}
          >
            +
          </Button>
        </div>
      </div>
    )
  }
  
  function CheckinTile(props: {
    title: string
    subtitle?: string
    right: React.ReactNode
  }) {
    return (
      <Card className="rounded-2xl border-black/5 bg-white shadow-sm">
        <div className="px-4 py-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium leading-tight">{props.title}</p>
              {props.subtitle ? (
                <p className="mt-0.5 text-xs text-slate-500">{props.subtitle}</p>
              ) : null}
            </div>
    
            <div className="shrink-0">{props.right}</div>
          </div>
        </div>
      </Card>
    )
    
  }
  
  

  return (
    <div className="min-h-screen bg-[#F6F7FB] pb-24">
  <main className="mx-auto w-full max-w-md p-4 pt-6">

        {activeTab === "check-in" && (
          <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold tracking-tight">
                Daily Check-in
              </CardTitle>
              <CardDescription className="text-base">
                Log your relaxation habits
              </CardDescription>
            </CardHeader>
            <CardContent>

              {/* Date Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="date">Date</Label>

                  {(() => {
  const today = todayYMD()
  const yesterday = yesterdayYMD()

  const isToday = formDate === today
  const isYesterday = formDate === yesterday

  const pillBase = "h-9 rounded-full px-4 text-sm font-medium"
  const pillActive = "bg-white shadow-sm text-foreground"
  const pillInactive = "text-muted-foreground hover:bg-white/60"

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        aria-pressed={isYesterday}
        className={`${pillBase} ${isYesterday ? pillActive : pillInactive}`}
        onClick={() => setFormDate(yesterday)}
      >
        Yesterday
      </Button>

      <Button
        type="button"
        variant="ghost"
        aria-pressed={isToday}
        className={`${pillBase} ${isToday ? pillActive : pillInactive}`}
        onClick={() => setFormDate(today)}
      >
        Today
      </Button>
    </div>
  )
})()}

                </div>

                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Targets (each as its own card) */}
        
              <div className="mt-4 mb-4 space-y-3">
              <Card className="rounded-2xl border-black/5 bg-white shadow-sm">
              <CardContent className="px-4 py-0">

    {/* Title at the top (full width) */}
    <p className="text-base font-medium leading-tight">
      {targets.labelAvgSleep || "Target 1"}
    </p>

    {/* Stepper */}
    <div className="mt-2">
      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12"
          onClick={() =>
            setSleepHours((prev) => Math.max(0, Math.round((prev - 0.5) * 2) / 2))
          }
          aria-label="Decrease sleep"
        >
          –
        </Button>

        <Input
          value={String(sleepHours)}
          inputMode="decimal"
          className="h-12 flex-1 text-center text-base rounded-xl border border-black/5 bg-[#F6F7FB]"
          onChange={(e) => {
            const raw = e.target.value
            // allow typing
            if (raw === "") return
            // allow decimals
            if (!/^\d*\.?\d*$/.test(raw)) return
            const n = Number(raw)
            if (!Number.isNaN(n)) {
              // snap to .5 steps
              setSleepHours(Math.round(n * 2) / 2)
            }
          }}
        />

        <Button
          type="button"
          variant="outline"
          className="h-12 w-12"
          onClick={() =>
            setSleepHours((prev) => Math.round((prev + 0.5) * 2) / 2)
          }
          aria-label="Increase sleep"
        >
          +
        </Button>
      </div>

      {/* Target under the stepper */}
      <p className="mt-2 text-xs text-slate-500">
        Target: {targets.targetAvgSleep} hrs
      </p>
    </div>
  </CardContent>
</Card>


  <CheckinTile
    title={targets.labelLateWork || "Target 2"}
    right={
      <Switch
        id="worked"
        checked={workedAfter1930}
        onCheckedChange={setWorkedAfter1930}
        className="scale-110"
      />
    }
  />

  <CheckinTile
    title={targets.labelReels || "Target 3"}
    right={
      <Switch
        id="reels"
        checked={watchedReels}
        onCheckedChange={setWatchedReels}
        className="scale-110"
      />
    }
  />

  <CheckinTile
    title={targets.labelYoga || "Target 4"}
    right={
      <Switch
        id="yoga"
        checked={didYoga}
        onCheckedChange={setDidYoga}
        className="scale-110"
      />
    }
  />
</div>



              {/* Save Button */}
<Button onClick={handleSave} disabled={isSavingLog} className="w-full">
  {isSavingLog ? "Saving..." : "Save"}
</Button>

{saveMessage && (
  <div className="mt-3 rounded-md border bg-green-50 px-3 py-2 text-sm text-green-800">
    {saveMessage}
  </div>
)}

</CardContent>
</Card>
)}

        {activeTab === "this-week" && (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>{targets.labelAvgSleep}</CardTitle>
                <CardDescription>Target: {targets.targetAvgSleep} hours</CardDescription>
              </CardHeader>
              <CardContent>

                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">
                    {weekMetrics.avgSleep > 0 ? weekMetrics.avgSleep.toFixed(1) : "—"}
                  </p>
                  {renderBadge(weekMetrics.sleepStatus)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>{targets.labelLateWork}</CardTitle>
                <CardDescription>Max: {targets.maxLateWorkNights} nights</CardDescription>
              </CardHeader>
              <CardContent>

                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">{weekMetrics.lateWorkNights}</p>
                  {renderBadge(weekMetrics.lateWorkStatus)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>{targets.labelReels}</CardTitle>
                <CardDescription>Max: {targets.maxReelsDays} days</CardDescription>
              </CardHeader>
              <CardContent>

                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">{weekMetrics.reelsDays}</p>
                  {renderBadge(weekMetrics.reelsStatus)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>{targets.labelYoga}</CardTitle>
                <CardDescription>Target: {targets.targetYogaDays} days</CardDescription>
              </CardHeader>
              <CardContent>

                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">{weekMetrics.yogaDays}</p>
                  {renderBadge(weekMetrics.yogaStatus)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "history" && (
          <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>History</CardTitle>
              <CardDescription>Your logged entries</CardDescription>
            </CardHeader>
            <CardContent>

              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground">No logs yet</p>
              ) : (
                <div className="space-y-2">
                  {[...logs]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((log) => (
                      <button
                        key={log.date}
                        onClick={() => loadLog(log)}
                        className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
                      >
                        <p className="font-medium">{formatDate(log.date)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
  <span>{targets.labelAvgSleep || "Target 1"}: {log.sleepHours}h</span>

  {log.workedAfter1930 && (
    <>
      <span className="text-slate-300">•</span>
      <span>{targets.labelLateWork || "Target 2"}</span>
    </>
  )}

  {log.watchedReels && (
    <>
      <span className="text-slate-300">•</span>
      <span>{targets.labelReels || "Target 3"}</span>
    </>
  )}

  {log.didYoga && (
    <>
      <span className="text-slate-300">•</span>
      <span>{targets.labelYoga || "Target 4"}</span>
    </>
  )}
</div>

                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "targets" && (
          <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <CardHeader>

              <CardTitle>Weekly Targets</CardTitle>
              <CardDescription>Adjust your goals</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-6">
  {/* Target names */}
  <div className="space-y-5">
    <div className="space-y-2">
      <Label htmlFor="t1Name">Target 1 name</Label>
      <Input
        id="t1Name"
        value={labelsDraft.labelAvgSleep}
        onChange={(e) => setLabelsDraft((p) => ({ ...p, labelAvgSleep: e.target.value }))}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="t2Name">Target 2 name</Label>
      <Input
        id="t2Name"
        value={labelsDraft.labelLateWork}
        onChange={(e) => setLabelsDraft((p) => ({ ...p, labelLateWork: e.target.value }))}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="t3Name">Target 3 name</Label>
      <Input
        id="t3Name"
        value={labelsDraft.labelReels}
        onChange={(e) => setLabelsDraft((p) => ({ ...p, labelReels: e.target.value }))}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="t4Name">Target 4 name</Label>
      <Input
        id="t4Name"
        value={labelsDraft.labelYoga}
        onChange={(e) => setLabelsDraft((p) => ({ ...p, labelYoga: e.target.value }))}
      />
    </div>
  </div>

  {/* Spacer / divider */}
  <div className="h-px w-full bg-black/5" />

  {/* Target numbers */}
  <div className="space-y-5">
    <StepperInput
      id="targetSleep"
      label={targets.labelAvgSleep || "Target 1"}
      value={targetsDraft.targetAvgSleep}
      step={0.5}
      min={4}
      max={12}
      onChange={(v) => setTargetsDraft((p) => ({ ...p, targetAvgSleep: v }))}
    />

    <StepperInput
      id="maxLateWork"
      label={targets.labelLateWork || "Target 2"}
      value={targetsDraft.maxLateWorkNights}
      step={1}
      min={0}
      max={7}
      onChange={(v) => setTargetsDraft((p) => ({ ...p, maxLateWorkNights: v }))}
    />

    <StepperInput
      id="maxReels"
      label={targets.labelReels || "Target 3"}
      value={targetsDraft.maxReelsDays}
      step={1}
      min={0}
      max={7}
      onChange={(v) => setTargetsDraft((p) => ({ ...p, maxReelsDays: v }))}
    />

    <StepperInput
      id="targetYoga"
      label={targets.labelYoga || "Target 4"}
      value={targetsDraft.targetYogaDays}
      step={1}
      min={0}
      max={7}
      onChange={(v) => setTargetsDraft((p) => ({ ...p, targetYogaDays: v }))}
    />
  </div>

  {/* Save Button */}
  <Button onClick={handleSaveTargets} disabled={isSavingTargets} className="w-full">
    {isSavingTargets ? "Saving..." : "Save targets"}
  </Button>

  {targetsMessage && (
    <div className="mt-2 rounded-md border bg-green-50 px-3 py-2 text-sm text-green-800">
      {targetsMessage}
    </div>
  )}
</CardContent>

          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-black/5 bg-white/90 shadow-lg backdrop-blur">

      <div className="grid grid-cols-4 px-2">

          <button
            onClick={() => setActiveTab("check-in")}
            className={`flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "check-in" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <ClipboardCheck size={20} />
            <span className="text-xs">Check-in</span>
          </button>

          <button
            onClick={() => setActiveTab("this-week")}
            className={`flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "this-week" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-xs">This Week</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "history" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <History size={20} />
            <span className="text-xs">History</span>
          </button>

          <button
            onClick={() => setActiveTab("targets")}
            className={`flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "targets" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Target size={20} />
            <span className="text-xs">Targets</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
