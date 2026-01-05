"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck, TrendingUp, History, Target } from "lucide-react"

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
  })

  const [targetsDraft, setTargetsDraft] = useState({
    targetAvgSleep: "8",
    maxLateWorkNights: "2",
    maxReelsDays: "4",
    targetYogaDays: "7",
  })

    const [targetsMessage, setTargetsMessage] = useState<string | null>(null)
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [isSavingTargets, setIsSavingTargets] = useState(false)
  const [isBooting, setIsBooting] = useState(true)

  
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: targetsRow, error: targetsError }, { data: logsRows, error: logsError }] =
          await Promise.all([
            supabase.from("targets").select("*").eq("singleton", true).maybeSingle(),
            supabase.from("logs").select("*").order("log_date", { ascending: true }),
          ])
    
        if (targetsError) console.error("Targets load failed:", targetsError)
        if (logsError) console.error("Logs load failed:", logsError)
    
        if (targetsRow) {
          setTargets({
            targetAvgSleep: Number(targetsRow.target_avg_sleep),
            maxLateWorkNights: Number(targetsRow.max_late_work_nights),
            maxReelsDays: Number(targetsRow.max_reels_days),
            targetYogaDays: Number(targetsRow.target_yoga_days),
          })
        }
    
        if (logsRows) {
          setLogs(
            logsRows.map((r) => ({
              date: r.log_date, // <-- from DB
              sleepHours: Number(r.sleep_hours),
              workedAfter1930: r.worked_after_1930,
              watchedReels: r.watched_reels,
              didYoga: r.did_yoga,
            }))
          )
        }
      } finally {
        // small delay makes it feel intentional
        setTimeout(() => setIsBooting(false), 350)
      }
    }
  
    load()
  }, [])

  useEffect(() => {
    setTargetsDraft({
      targetAvgSleep: String(targets.targetAvgSleep),
      maxLateWorkNights: String(targets.maxLateWorkNights),
      maxReelsDays: String(targets.maxReelsDays),
      targetYogaDays: String(targets.targetYogaDays),
    })
  }, [targets])


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

    const targetsToSave = {
      targetAvgSleep: Number(targetsDraft.targetAvgSleep),
      maxLateWorkNights: Number(targetsDraft.maxLateWorkNights),
      maxReelsDays: Number(targetsDraft.maxReelsDays),
      targetYogaDays: Number(targetsDraft.targetYogaDays),
    }

    const { error } = await supabase.from("targets").upsert(
      {
        singleton: true,
        target_avg_sleep: targetsToSave.targetAvgSleep,
        max_late_work_nights: targetsToSave.maxLateWorkNights,
        max_reels_days: targetsToSave.maxReelsDays,
        target_yoga_days: targetsToSave.targetYogaDays,
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

    setTargets(targetsToSave)
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
              // allow empty (prevents showing 0)
              const next = e.target.value
              if (next === "") return onChange("")
              // allow numbers + decimals
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

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="text-2xl font-semibold">Relaxation Tracker</div>
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Content */}
      <main className="flex-1 p-4 pt-6">
        {activeTab === "check-in" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-semibold tracking-tight">
                Daily Check-in
              </CardTitle>
              <CardDescription className="text-base">
                Log your relaxation habits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="date">Date</Label>

                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFormDate(todayYMD())}>
                      Today
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFormDate(yesterdayYMD())}>
                      Yesterday
                    </Button>
                  </div>
                </div>

                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Sleep Hours Picker */}
              <div className="space-y-2">
                <Label htmlFor="sleep">Sleep Hours</Label>
                <select
                  id="sleep"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Array.from({ length: 17 }, (_, i) => 4 + i * 0.5).map((hours) => (
                    <option key={hours} value={hours}>
                      {hours} hours
                    </option>
                  ))}
                </select>
                {sleepHours >= 8 && <p className="text-sm text-muted-foreground">✓ Slept at least 8 hours</p>}
              </div>

              {/* Boolean Switches */}
              <div className="space-y-5">
                <div className="flex min-h-[48px] items-center justify-between">
                  <Label htmlFor="worked" className="flex-1">
                    Worked after 7:30 PM
                  </Label>
                  <Switch
                    id="worked"
                    checked={workedAfter1930}
                    onCheckedChange={setWorkedAfter1930}
                    className="scale-110"
                  />
                </div>

                <div className="flex min-h-[48px] items-center justify-between">
                  <Label htmlFor="reels" className="flex-1">
                    Watched reels/shorts
                  </Label>
                  <Switch
                    id="reels"
                    checked={watchedReels}
                    onCheckedChange={setWatchedReels}
                    className="scale-110"
                  />
                </div>

                <div className="flex min-h-[48px] items-center justify-between">
                  <Label htmlFor="yoga" className="flex-1">
                    Did yoga/meditation
                  </Label>
                  <Switch
                    id="yoga"
                    checked={didYoga}
                    onCheckedChange={setDidYoga}
                    className="scale-110"
                  />
                </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Average Sleep</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Late Work Nights</CardTitle>
                <CardDescription>Max: {targets.maxLateWorkNights} nights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">{weekMetrics.lateWorkNights}</p>
                  {renderBadge(weekMetrics.lateWorkStatus)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reels Days</CardTitle>
                <CardDescription>Max: {targets.maxReelsDays} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-semibold">{weekMetrics.reelsDays}</p>
                  {renderBadge(weekMetrics.reelsStatus)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yoga Days</CardTitle>
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
          <Card>
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
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>💤 {log.sleepHours}h</span>
                          {log.workedAfter1930 && <span>💼 Late work</span>}
                          {log.watchedReels && <span>📱 Reels</span>}
                          {log.didYoga && <span>🧘 Yoga</span>}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "targets" && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Targets</CardTitle>
              <CardDescription>Adjust your goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StepperInput
                id="targetSleep"
                label="Target Average Sleep (hours)"
                value={targetsDraft.targetAvgSleep}
                step={0.5}
                min={4}
                max={12}
                onChange={(v) => setTargetsDraft((p) => ({ ...p, targetAvgSleep: v }))}
              />

              <StepperInput
                id="maxLateWork"
                label="Max Late Work Nights"
                value={targetsDraft.maxLateWorkNights}
                step={1}
                min={0}
                max={7}
                onChange={(v) => setTargetsDraft((p) => ({ ...p, maxLateWorkNights: v }))}
              />

              <StepperInput
                id="maxReels"
                label="Max Reels Days"
                value={targetsDraft.maxReelsDays}
                step={1}
                min={0}
                max={7}
                onChange={(v) => setTargetsDraft((p) => ({ ...p, maxReelsDays: v }))}
              />

              <StepperInput
                id="targetYoga"
                label="Target Yoga Days"
                value={targetsDraft.targetYogaDays}
                step={1}
                min={0}
                max={7}
                onChange={(v) => setTargetsDraft((p) => ({ ...p, targetYogaDays: v }))}
              />

              {/* Save Button */}
              <Button onClick={handleSaveTargets} disabled={isSavingTargets} className="w-full">
                {isSavingTargets ? "Saving..." : "Save targets"}
              </Button>

              {targetsMessage && (
                <div className="mt-3 rounded-md border bg-green-50 px-3 py-2 text-sm text-green-800">
                  {targetsMessage}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card">
        <div className="grid grid-cols-4">
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
