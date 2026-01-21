import { useCallback, useState, useEffect } from 'react'
import { AnalyticsDashboard } from 'drizzle-cube/client'
import {
  useDashboards,
  useDashboard,
  useDefaultDashboard,
  useUpdateDashboard,
  useResetDashboardById,
  useDeleteDashboard,
  useCreateDashboard,
  useDefaultDashboardConfig
} from '../hooks/useDashboards'
import type { DashboardConfig } from '../types/dashboard'

export default function DashboardPage() {
  // Track which dashboard is selected (null = default)
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null)

  // Fetch all dashboards for the selector
  const { data: dashboards = [], isLoading: isLoadingList } = useDashboards()

  // Fetch the default dashboard (used when no specific dashboard is selected)
  const { data: defaultDashboard, isLoading: isLoadingDefault, error: defaultError } = useDefaultDashboard()

  // Fetch specific selected dashboard (only when a specific ID is selected)
  const { data: selectedDashboard, isLoading: isLoadingSelected, error: selectedError } = useDashboard(
    selectedDashboardId ?? undefined
  )

  // Determine which dashboard to display
  const dashboard = selectedDashboardId ? selectedDashboard : defaultDashboard
  const isLoading = isLoadingList || (selectedDashboardId ? isLoadingSelected : isLoadingDefault)
  const error = selectedDashboardId ? selectedError : defaultError

  // Mutations
  const { mutateAsync: updateDashboard } = useUpdateDashboard()
  const { mutateAsync: resetDashboard, isPending: isResetting } = useResetDashboardById()
  const { mutateAsync: deleteDashboard, isPending: isDeleting } = useDeleteDashboard()
  const { mutateAsync: createDashboard, isPending: isCreating } = useCreateDashboard()

  // Fetch default config template for creating new dashboards
  const { data: defaultConfig } = useDefaultDashboardConfig()

  // UI state
  const [localConfig, setLocalConfig] = useState<DashboardConfig | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createWithDefault, setCreateWithDefault] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)

  // Clear local config when dashboard changes
  useEffect(() => {
    setLocalConfig(null)
  }, [selectedDashboardId])

  const dashboardId = dashboard?.id
  const activeConfig = localConfig ?? dashboard?.config

  // Only allow delete if more than one dashboard exists
  const canDelete = dashboards.length > 1

  const handleReset = useCallback(async () => {
    if (!dashboardId) return
    try {
      await resetDashboard(dashboardId)
      setLocalConfig(null)
      setShowResetConfirm(false)
    } catch (err) {
      console.error('Failed to reset dashboard:', err)
    }
  }, [dashboardId, resetDashboard])

  const handleDelete = useCallback(async () => {
    if (!dashboardId || !canDelete) return
    try {
      await deleteDashboard(dashboardId)
      setShowDeleteConfirm(false)
      // Switch to another dashboard (first in the list that isn't the deleted one)
      const remaining = dashboards.filter(d => d.id !== dashboardId)
      if (remaining.length > 0) {
        // Find the default dashboard or use the first one
        const newDefault = remaining.find(d => d.isDefault) ?? remaining[0]
        setSelectedDashboardId(newDefault.isDefault ? null : newDefault.id)
      } else {
        setSelectedDashboardId(null)
      }
    } catch (err) {
      console.error('Failed to delete dashboard:', err)
    }
  }, [dashboardId, canDelete, deleteDashboard, dashboards])

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return
    setCreateError(null)

    try {
      // Create config - either default or empty
      const config: DashboardConfig = createWithDefault && defaultConfig
        ? defaultConfig
        : { layoutMode: 'rows', grid: { cols: 12, rowHeight: 90, minW: 3, minH: 3 }, filters: [], portlets: [] }

      const newDashboard = await createDashboard({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        config
      })

      // Close modal and reset form
      setShowCreateModal(false)
      setCreateName('')
      setCreateDescription('')
      setCreateWithDefault(true)

      // Switch to the new dashboard
      setSelectedDashboardId(newDashboard.id)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create dashboard')
    }
  }, [createName, createDescription, createWithDefault, defaultConfig, createDashboard])

  const handleConfigChange = useCallback((config: DashboardConfig) => {
    setLocalConfig(config)
  }, [])

  const handleSave = useCallback(
    async (config: DashboardConfig) => {
      if (!dashboardId || !dashboard) return
      await updateDashboard({
        id: dashboardId,
        name: dashboard.name,
        description: dashboard.description ?? undefined,
        displayOrder: dashboard.displayOrder,
        isDefault: dashboard.isDefault,
        config
      })
      setLocalConfig(null)
    },
    [dashboard, dashboardId, updateDashboard]
  )

  const handleDashboardSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    // 'default' means use the default dashboard (selectedDashboardId = null)
    setSelectedDashboardId(value === 'default' ? null : value)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-2 text-base-content/60">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-8">
          <p className="text-error">Failed to load dashboard</p>
          <p className="text-sm text-base-content/60 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium">No Dashboard Configured</h3>
          <p className="mt-1 text-sm text-base-content/60">
            No default dashboard has been set up yet.
          </p>
          <p className="mt-4 text-sm text-base-content/60">
            Run database migrations to create the default dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header - responsive layout */}
      <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-20">
        {/* Title and description */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="mt-1 text-base-content/60 line-clamp-2">{dashboard.description}</p>
          )}
        </div>

        {/* Controls - single line */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Dashboard selector - only show when more than 1 dashboard */}
          {dashboards.length > 1 && (
            <select
              className="select select-sm w-48 border border-primary"
              value={selectedDashboardId ?? 'default'}
              onChange={handleDashboardSelect}
            >
              {dashboards.map((d) => (
                <option key={d.id} value={d.isDefault ? 'default' : d.id}>
                  {d.name}{d.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          )}

          {/* Create Dashboard button */}
          <button
            className="btn btn-outline btn-primary btn-sm btn-square"
            onClick={() => setShowCreateModal(true)}
            title="Create new dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* Settings dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-outline btn-primary btn-sm btn-square">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content z-50 menu p-2 shadow-xl bg-base-100 border border-base-300 rounded-box w-52"
            >
              <button
                className="btn btn-ghost btn-sm justify-start"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResetting}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset Layout
              </button>
              {canDelete && (
                <button
                  className="btn btn-ghost btn-sm justify-start text-error"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnalyticsDashboard
        config={activeConfig!}
        editable={true}
        onConfigChange={handleConfigChange}
        onSave={handleSave}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Reset Dashboard?</h3>
            <p className="py-4">
              This will restore the dashboard to its default configuration. Any
              customizations you've made will be lost.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting && <span className="loading loading-spinner loading-xs"></span>}
                Reset
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowResetConfirm(false)}
          ></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Dashboard?</h3>
            <p className="py-4">
              Are you sure you want to delete "{dashboard.name}"? This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && <span className="loading loading-spinner loading-xs"></span>}
                Delete
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowDeleteConfirm(false)}
          ></div>
        </div>
      )}

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Dashboard</h3>
            <div className="py-4 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Dashboard name"
                  className="input input-bordered w-full"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (optional)</span>
                </label>
                <textarea
                  placeholder="Dashboard description"
                  className="textarea textarea-bordered w-full"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={createWithDefault}
                    onChange={(e) => setCreateWithDefault(e.target.checked)}
                  />
                  <span className="label-text">Start with default dashboard layout</span>
                </label>
              </div>
              {createError && (
                <div className="alert alert-error">
                  <span>{createError}</span>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateName('')
                  setCreateDescription('')
                  setCreateWithDefault(true)
                  setCreateError(null)
                }}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={isCreating || !createName.trim()}
              >
                {isCreating && <span className="loading loading-spinner loading-xs"></span>}
                Create
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              if (!isCreating) {
                setShowCreateModal(false)
                setCreateName('')
                setCreateDescription('')
                setCreateWithDefault(true)
                setCreateError(null)
              }
            }}
          ></div>
        </div>
      )}
    </div>
  )
}
