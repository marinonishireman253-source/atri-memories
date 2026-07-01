export function ViewerReportForm({
  user,
  busy,
  submittingReport,
  reportReasons,
  reportReason,
  reportNote,
  reporterEmail,
  reportMessage,
  onReportReasonChange,
  onReportNoteChange,
  onReporterEmailChange,
  onCancel,
  onSubmit,
}) {
  return (
    <form className="report-form" onSubmit={onSubmit}>
      <label htmlFor="report-reason">举报原因</label>
      <select
        id="report-reason"
        value={reportReason}
        onChange={(event) => onReportReasonChange(event.target.value)}
        disabled={busy || submittingReport}
      >
        {reportReasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      {!user && (
        <>
          <label htmlFor="reporter-email">联系邮箱（可选）</label>
          <input
            id="reporter-email"
            type="email"
            value={reporterEmail}
            onChange={(event) => onReporterEmailChange(event.target.value)}
            maxLength="254"
            placeholder="用于管理员必要时联系你"
            disabled={busy || submittingReport}
          />
        </>
      )}
      <label htmlFor="report-note">补充说明（可选）</label>
      <textarea
        id="report-note"
        value={reportNote}
        onChange={(event) => onReportNoteChange(event.target.value)}
        maxLength="500"
        rows="3"
        placeholder="例如说明来源、侵权线索或具体问题"
        disabled={busy || submittingReport}
      />
      {reportMessage && <p className="form-error">{reportMessage}</p>}
      <div className="edit-actions">
        <button className="ghost-button" type="button" onClick={onCancel} disabled={busy || submittingReport}>
          取消
        </button>
        <button className="primary-button" type="submit" disabled={busy || submittingReport}>
          {submittingReport ? '提交中...' : '提交举报'}
        </button>
      </div>
    </form>
  );
}
