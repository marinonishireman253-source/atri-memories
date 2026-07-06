import { compactDate, formatBytes } from './adminFormatters.js';
import {
  inviteLimitSummary,
  inviteUsageSummary,
} from '../../lib/adminInvitePolicy.js';

export function AdminUsersTab({
  userQuery,
  onUserQueryChange,
  userSegment,
  onUserSegmentChange,
  userSegments,
  loadingUsers,
  onRefreshUsers,
  inviteEmail,
  onInviteEmailChange,
  onInviteSubmit,
  invitingUser,
  invitePolicy,
  filteredUsers,
  mutatingUser,
  onViewUserImages,
  onToggleAdmin,
  onToggleUpload,
  onSetUploadLimit,
}) {
  const inviteBlocked = invitePolicy?.allows_invite === false;

  return (
    <div className="user-admin-panel">
      <div className="admin-toolbar">
        <label className="admin-search">
          搜索用户
          <input
            type="search"
            value={userQuery}
            onChange={(event) => onUserQueryChange(event.target.value)}
            placeholder="邮箱或用户 ID"
            disabled={loadingUsers}
          />
        </label>
        <div className="admin-actions">
          <button className="ghost-button compact" type="button" onClick={onRefreshUsers} disabled={loadingUsers}>
            {loadingUsers ? '刷新中...' : '刷新用户'}
          </button>
        </div>
      </div>
      <div className="admin-user-segments" aria-label="用户状态分组">
        {userSegments.map((segment) => (
          <button
            className={`admin-segment-button ${userSegment === segment.key ? 'active' : ''}`}
            type="button"
            key={segment.key}
            onClick={() => onUserSegmentChange(segment.key)}
            aria-pressed={userSegment === segment.key}
          >
            <span>{segment.label}</span>
            <strong>{segment.count}</strong>
          </button>
        ))}
      </div>
      <form className="invite-form" onSubmit={onInviteSubmit}>
        <div>
          <strong>邀请用户</strong>
          <p className="admin-help-text">
            适合在关闭公开注册后发放账号。邮件内容和跳转地址由登录邮件配置决定。
          </p>
          <p className="admin-help-text">
            当前策略：{inviteLimitSummary(invitePolicy)}。{inviteUsageSummary(invitePolicy)}。
          </p>
        </div>
        <label className="admin-search">
          邀请邮箱
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => onInviteEmailChange(event.target.value)}
            placeholder="new-user@example.com"
            disabled={invitingUser || loadingUsers || inviteBlocked}
            required
          />
        </label>
        <div className="admin-actions">
          <button className="primary-button compact" type="submit" disabled={invitingUser || loadingUsers || inviteBlocked}>
            {invitingUser ? '发送中...' : inviteBlocked ? '已达发送上限' : '发送邀请'}
          </button>
        </div>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table user-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>状态</th>
              <th>上传权限</th>
              <th>容量</th>
              <th>注册时间</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong title={user.email}>{user.email}</strong>
                  <span title={user.id}>{user.id}</span>
                </td>
                <td>
                  <span className={`user-role ${user.is_admin ? 'admin' : ''}`}>
                    {user.is_admin ? '管理员' : '用户'}
                  </span>
                  {!user.email_confirmed_at && user.invited_at && (
                    <span className="user-role">邀请中</span>
                  )}
                  <span>{user.email_confirmed_at ? '邮箱已确认' : '邮箱未确认'}</span>
                </td>
                <td>
                  <span className={`user-role ${user.can_upload ? '' : 'blocked'}`}>
                    {user.can_upload ? '允许上传' : '暂停上传'}
                  </span>
                  <span>
                    {user.upload_count} / {user.upload_limit_total ?? '不限'}
                  </span>
                </td>
                <td>{formatBytes(user.storage_used_bytes)}</td>
                <td>{compactDate(user.created_at)}</td>
                <td>{compactDate(user.last_sign_in_at)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="text-button inline"
                      type="button"
                      onClick={() => onViewUserImages(user)}
                      disabled={!user.upload_count}
                    >
                      查看图片
                    </button>
                    <button
                      className={user.is_admin ? 'text-button inline danger-text' : 'text-button inline'}
                      type="button"
                      onClick={() => onToggleAdmin(user)}
                      disabled={mutatingUser === user.id}
                    >
                      {mutatingUser === user.id
                        ? '处理中...'
                        : user.is_admin
                          ? '取消管理员'
                          : '设为管理员'}
                    </button>
                    <button
                      className={user.can_upload ? 'text-button inline danger-text' : 'text-button inline'}
                      type="button"
                      onClick={() => onToggleUpload(user)}
                      disabled={mutatingUser === user.id}
                    >
                      {user.can_upload ? '暂停上传' : '允许上传'}
                    </button>
                    <button
                      className="text-button inline"
                      type="button"
                      onClick={() => onSetUploadLimit(user)}
                      disabled={mutatingUser === user.id}
                    >
                      设置上限
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="empty-state compact">
            <span aria-hidden="true">◇</span>
            <h3>没有匹配的用户</h3>
            <p>换个邮箱关键词再试。</p>
          </div>
        )}
      </div>
    </div>
  );
}
