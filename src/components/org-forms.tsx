"use client";
import { useEffect, useRef, useState } from "react";
import { addEmployee, addMetric, assignManagers, updateEmployee } from "@/app/actions";
import { Result, Submit, inputCls, labelCls, useAction } from "./forms";

type Opt = { id: string; name: string; l1?: string | null };

function ManagerSelects({ people, excludeId, l1, l2 }: { people: Opt[]; excludeId?: string; l1: string | null; l2: string | null }) {
  const [a, setA] = useState(l1 ?? "");
  const [b, setB] = useState(l2 ?? "");
  const options = people.filter((p) => p.id !== excludeId);
  return (
    <>
      <label className="block">
        <span className={labelCls}>L1 manager (direct — can edit scorecard)</span>
        <select name="l1_manager_id" value={a} className={inputCls}
          onChange={(e) => {
            setA(e.target.value);
            // Sensible default: L2 = the new L1's own manager.
            const next = people.find((p) => p.id === e.target.value)?.l1 ?? "";
            setB(next && next !== excludeId ? next : "");
          }}>
          <option value="">None</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>L2 manager (skip-level — view context only)</span>
        <select name="l2_manager_id" value={b} onChange={(e) => setB(e.target.value)} className={inputCls}>
          <option value="">None</option>
          {options.filter((p) => p.id !== a).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
    </>
  );
}

export function AssignManagerForm({ employeeId, people, l1, l2 }: { employeeId: string; people: Opt[]; l1: string | null; l2: string | null }) {
  const [state, action] = useAction(assignManagers);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employee_id" value={employeeId} />
      <ManagerSelects people={people} excludeId={employeeId} l1={l1} l2={l2} />
      <div className="flex items-center gap-3"><Submit>Save managers</Submit><Result state={state} /></div>
    </form>
  );
}

export function EmployeeDetailsForm({ employee, departments }: {
  employee: { id: string; designation: string; department_id: string; status: string };
  departments: { id: string; name: string }[];
}) {
  const [state, action] = useAction(updateEmployee);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employee_id" value={employee.id} />
      <label className="block"><span className={labelCls}>Designation</span>
        <input name="designation" defaultValue={employee.designation} className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Department</span>
        <select name="department_id" defaultValue={employee.department_id} className={inputCls}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></label>
      <label className="block"><span className={labelCls}>Status</span>
        <select name="status" defaultValue={employee.status} className={inputCls}>
          <option value="active">Active</option><option value="resigned">Resigned</option><option value="exit">Exited</option>
        </select></label>
      <div className="flex items-center gap-3"><Submit>Save details</Submit><Result state={state} /></div>
    </form>
  );
}

export function AddEmployeeForm({ departments, people, defaultDepartment }: {
  departments: { id: string; name: string }[]; people: Opt[]; defaultDepartment?: string;
}) {
  const [state, action] = useAction(addEmployee);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  if (!open) return <button onClick={() => setOpen(true)} className="text-xs px-3 py-1.5 rounded bg-ink text-warmwhite">Add employee</button>;
  return (
    <form ref={ref} action={action} className="bg-panel border border-line rounded p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      <div className="sm:col-span-2 flex items-baseline justify-between">
        <h2 className="font-serif text-lg">New employee</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">Cancel</button>
      </div>
      <label className="block"><span className={labelCls}>Full name</span><input name="name" required className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Employee number</span><input name="employee_no" required className={inputCls} placeholder="e.g. BI-005" /></label>
      <label className="block"><span className={labelCls}>Designation</span><input name="designation" className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Department</span>
        <select name="department_id" defaultValue={defaultDepartment} className={inputCls}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></label>
      <ManagerSelects people={people} l1={null} l2={null} />
      <div className="sm:col-span-2 flex items-center gap-3">
        <Submit>Add employee</Submit><Result state={state} />
        <span className="text-[11px] text-muted">A preview login is created automatically so you can test their view.</span>
      </div>
    </form>
  );
}

export function AddMetricForm({ scorecardId }: { scorecardId: string }) {
  const [state, action] = useAction(addMetric);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setOpen(false); } }, [state]);

  if (!open) return (
    <div className="flex items-center gap-3">
      <button onClick={() => setOpen(true)} className="text-xs px-3 py-1.5 rounded border border-line hover:bg-hair">Add metric</button>
      <Result state={state} />
    </div>
  );
  return (
    <form ref={ref} action={action} className="bg-warmwhite border border-line rounded p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <input type="hidden" name="scorecard_id" value={scorecardId} />
      <label className="col-span-2"><span className={labelCls}>Metric name</span><input name="name" required className={inputCls} /></label>
      <label className="col-span-2"><span className={labelCls}>Description</span><input name="description" className={inputCls} /></label>
      <label><span className={labelCls}>Type</span>
        <select name="type" className={inputCls}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></label>
      <label><span className={labelCls}>Unit</span>
        <select name="unit" className={inputCls}>
          <option value="count">Count</option><option value="%">Percent</option><option value="days">Days</option><option value="hours">Hours</option><option value="score">Score / 5</option>
        </select></label>
      <label><span className={labelCls}>Direction</span>
        <select name="direction" className={inputCls}><option value="higher_is_better">Higher is better</option><option value="lower_is_better">Lower is better</option></select></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={labelCls}>Target</span><input name="target" required inputMode="decimal" className={inputCls} /></label>
        <label><span className={labelCls}>Weight %</span><input name="weight" required inputMode="decimal" className={inputCls} /></label>
      </div>
      <div className="col-span-2 md:col-span-4 flex items-center gap-3">
        <Submit>Add metric</Submit>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">Cancel</button>
        <Result state={state} />
      </div>
    </form>
  );
}
