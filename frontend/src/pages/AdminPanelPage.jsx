import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import useToast from '../hooks/useToast'
import {
  approveSellerRequest,
  createCategory,
  deleteCategory,
  updateCategory,
  getSellerRequests,
  getUsers,
  rejectSellerRequest,
  updateUserRole,
} from '../services/adminService'
import { getCategories } from '../services/auctionService'
import { formatReadableDateTime } from '../utils/dateTime'

const roles = ['bidder', 'seller', 'admin', 'defender']

function statusTone(user) {
  if (user.is_blocked) {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-emerald-100 text-emerald-700'
}

function requestTone(status) {
  if (status === 'approved') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'rejected') {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-amber-100 text-amber-700'
}

function AdminSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/80 shadow-soft" />
      ))}
    </div>
  )
}

function AdminPanelPage() {
  const [users, setUsers] = useState([])
  const [sellerRequests, setSellerRequests] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const loadAdminData = useCallback(async () => {
    setError('')

    try {
      const [userData, requestData, categoryData] = await Promise.all([getUsers(), getSellerRequests(), getCategories()])
      setUsers(userData)
      setSellerRequests(requestData)
      setCategories(categoryData)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadAdminData, 0)
    return () => clearTimeout(timeout)
  }, [loadAdminData])

  const metrics = useMemo(() => {
    const defenders = users.filter((user) => user.role === 'defender').length
    const sellers = users.filter((user) => user.role === 'seller').length
    const pendingRequests = sellerRequests.filter((request) => request.status === 'pending').length

    return { defenders, sellers, pendingRequests }
  }, [sellerRequests, users])

  const resetCategoryForm = () => {
    setCategoryName('')
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleCreateCategory = async (event) => {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) {
      showToast('Category name is required.', 'error')
      return
    }

    setIsActionLoading(true)
    try {
      const category = await createCategory(name)
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryName('')
      showToast('Category created.', 'success')
    } catch (categoryError) {
      showToast(categoryError.message || 'Category could not be created.', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUpdateCategory = async (category) => {
    const name = editingCategoryName.trim()
    if (!name) {
      showToast('Category name is required.', 'error')
      return
    }

    setIsActionLoading(true)
    try {
      const updatedCategory = await updateCategory(category.id, name)
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? updatedCategory : item)).sort((a, b) => a.name.localeCompare(b.name)),
      )
      resetCategoryForm()
      showToast('Category updated.', 'success')
    } catch (categoryError) {
      showToast(categoryError.message || 'Category could not be updated.', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const openRoleConfirmation = (user, nextRole) => {
    if (user.role === nextRole) {
      return
    }

    setConfirmation({
      title: 'Update user role',
      message: `Change ${user.username} from ${user.role} to ${nextRole}?`,
      confirmLabel: 'Update role',
      tone: nextRole === 'defender' ? 'accent' : 'primary',
      action: async () => {
        const updatedUser = await updateUserRole(user.id, nextRole)
        setUsers((current) => current.map((item) => (item.id === user.id ? updatedUser : item)))
        showToast('User role updated.', 'success')
      },
    })
  }

  const openRequestConfirmation = (request, action) => {
    const isApprove = action === 'approve'
    const username = request.user?.username || `Account ${request.user_id}`

    setConfirmation({
      title: isApprove ? 'Approve seller request' : 'Reject seller request',
      message: `${isApprove ? 'Approve' : 'Reject'} seller access for ${username}?`,
      confirmLabel: isApprove ? 'Approve' : 'Reject',
      tone: isApprove ? 'accent' : 'secondary',
      action: async () => {
        const updatedRequest = isApprove
          ? await approveSellerRequest(request.id)
          : await rejectSellerRequest(request.id)
        setSellerRequests((current) =>
          current.map((item) => (item.id === request.id ? updatedRequest : item)),
        )

        if (isApprove) {
          const userData = await getUsers()
          setUsers(userData)
        }

        showToast(`Seller request ${isApprove ? 'approved' : 'rejected'}.`, 'success')
      },
    })
  }

  const openDeleteCategoryConfirmation = (category) => {
    setConfirmation({
      title: 'Delete category',
      message: `Delete "${category.name}"? Categories used by auctions cannot be deleted.`,
      confirmLabel: 'Delete',
      tone: 'secondary',
      action: async () => {
        await deleteCategory(category.id)
        setCategories((current) => current.filter((item) => item.id !== category.id))
        if (editingCategoryId === category.id) {
          resetCategoryForm()
        }
        showToast('Category deleted.', 'success')
      },
    })
  }

  const confirmAction = async () => {
    if (!confirmation?.action) {
      return
    }

    setIsActionLoading(true)

    try {
      await confirmation.action()
      setConfirmation(null)
    } catch (actionError) {
      showToast(actionError.message, 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="page-enter space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            Admin Panel
          </div>
          <h1 className="text-3xl font-black text-app-text sm:text-4xl">Platform operations</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Manage user roles, seller onboarding decisions, and account access.
          </p>
        </div>
        <Card className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Users</p>
            <p className="mt-1 text-3xl font-black text-app-text">{users.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Defenders</p>
            <p className="mt-1 text-3xl font-black text-app-text">{metrics.defenders}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
            <p className="mt-1 text-3xl font-black text-app-text">{metrics.pendingRequests}</p>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} onClick={() => setActiveTab('users')}>
            User Management
          </Button>
          <Button
            variant={activeTab === 'sellerRequests' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('sellerRequests')}
          >
            Seller Requests
          </Button>
          <Button
            variant={activeTab === 'categories' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </Button>
          <Button
            variant={activeTab === 'systemControls' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('systemControls')}
          >
            System Controls
          </Button>
          <Button variant="ghost" onClick={loadAdminData}>
            Refresh
          </Button>
        </div>
      </Card>

      {error ? (
        <EmptyState title="Admin data unavailable" message={error}>
          <Button variant="secondary" onClick={loadAdminData}>
            Retry
          </Button>
        </EmptyState>
      ) : isLoading ? (
        <AdminSkeleton />
      ) : activeTab === 'users' ? (
        <section className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:-translate-y-0.5">
              <div className="grid gap-4 lg:grid-cols-[1fr_14rem_11rem] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-app-text">{user.username}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusTone(user)}`}>
                      {user.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{user.email}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Account ID {user.id}
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Role</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold capitalize text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100"
                    value={user.role}
                    onChange={(event) => openRoleConfirmation(user, event.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <Button variant="accent" onClick={() => openRoleConfirmation(user, 'defender')} disabled={user.role === 'defender'}>
                  Assign defender
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : activeTab === 'sellerRequests' && sellerRequests.length ? (
        <section className="grid gap-4">
          {sellerRequests.map((request) => (
            <Card key={request.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_10rem_14rem] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-app-text">
                      {request.user?.username || `Account ${request.user_id}`}
                    </h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${requestTone(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {request.user?.email || 'No email available'}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Requested {formatReadableDateTime(request.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">User</p>
                  <p className="mt-1 text-lg font-black text-app-text">#{request.user_id}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="accent"
                    disabled={request.status !== 'pending'}
                    onClick={() => openRequestConfirmation(request, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={request.status !== 'pending'}
                    onClick={() => openRequestConfirmation(request, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : activeTab === 'sellerRequests' ? (
        <EmptyState
          title="No seller requests"
          message="Seller onboarding requests will appear here when bidders ask for seller access."
        />
      ) : activeTab === 'categories' ? (
        <section className="grid gap-4 lg:grid-cols-[24rem_1fr]">
          <Card>
            <p className="text-sm font-semibold text-violet-700">Category management</p>
            <h2 className="mt-1 text-xl font-black text-app-text">Create category</h2>
            <form className="mt-5 space-y-4" onSubmit={handleCreateCategory}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-app-text">Category name</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Electronics"
                />
              </label>
              <Button className="w-full" type="submit" disabled={isActionLoading}>
                Create Category
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sky-700">Database categories</p>
                <h2 className="mt-1 text-xl font-black text-app-text">{categories.length} categories</h2>
              </div>
              {editingCategoryId ? (
                <Button variant="ghost" onClick={resetCategoryForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3">
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    {editingCategoryId === category.id ? (
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100"
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                      />
                    ) : (
                      <div>
                        <p className="text-lg font-black text-app-text">{category.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Category #{category.id}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {editingCategoryId === category.id ? (
                        <Button disabled={isActionLoading} onClick={() => handleUpdateCategory(category)}>
                          Save
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingCategoryId(category.id)
                            setEditingCategoryName(category.name)
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      <Button variant="ghost" disabled={isActionLoading} onClick={() => openDeleteCategoryConfirmation(category)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">User Management</p>
            <h2 className="mt-2 text-xl font-black text-app-text">Role controls active</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Admins can promote sellers, assign defenders, and update account roles from the management tab.
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">Seller Requests</p>
            <h2 className="mt-2 text-xl font-black text-app-text">{metrics.pendingRequests} pending</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review marketplace creator requests before bidder accounts can publish auctions.
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase text-slate-500">System Controls</p>
            <h2 className="mt-2 text-xl font-black text-app-text">Data refresh</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pull the latest users and seller requests without leaving the admin workspace.
            </p>
            <Button className="mt-4 w-full" variant="secondary" onClick={loadAdminData}>
              Refresh admin data
            </Button>
          </Card>
        </section>
      )}

      <ConfirmModal
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        isLoading={isActionLoading}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
    </div>
  )
}

export default AdminPanelPage
