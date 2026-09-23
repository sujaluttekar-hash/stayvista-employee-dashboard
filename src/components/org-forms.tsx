"use client";
import { useEffect, useRef, useState } from "react";
import { addDepartmentMetric, addEmployee, addMetric, assignManagers, placeInDepartment, updateEmployee } from "@/app/actions";
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
  employee: { id: string; designation: string; department_id: string | null; status: string };
  departments: { id: string; name: string }[];
}) {
  const [state, action] = useAction(updateEmployee);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="employee_id" value={employee.id} />
      <label className="block"><span className={labelCls}>Designation</span>
        <input name="designation" defaultValue={employee.designation} className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Department</span>
        <select name="department_id" defaultValue={employee.department_id ?? ""} className={inputCls}>
          <option value="">Unassigned</option>
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
  const ref = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => { if (state?.ok) setFormKey((k) => k + 1); }, [state]);

  return (
    <form key={formKey} ref={ref} action={action} className="bg-panel border border-line rounded p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 flex items-baseline justify-between">
        <h2 className="font-serif text-lg">Add employee</h2>
        <Result state={state} />
      </div>
      <label className="block"><span className={labelCls}>Full name</span><input name="name" required className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Employee number (optional)</span><input name="employee_no" className={inputCls} placeholder="Auto if left blank" /></label>
      <label className="block"><span className={labelCls}>Designation</span><input name="designation" className={inputCls} /></label>
      <label className="block"><span className={labelCls}>Department</span>
        <select name="department_id" defaultValue={defaultDepartment ?? ""} className={inputCls}>
          <option value="">Unassigned for now</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></label>
      <ManagerSelects people={people} l1={null} l2={null} />
      <div className="sm:col-span-2"><Submit>Add employee</Submit></div>
    </form>
  );
}

export function AddMetricForm({ scorecardId, departmentId, periodId, label = "Add metric", note }: {
  scorecardId?: string; departmentId?: string; periodId?: string; label?: string; note?: string;
}) {
  const [state, action] = useAction(departmentId ? addDepartmentMetric : addMetric);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setOpen(false); } }, [state]);

  if (!open) return (
    <div className="flex items-center gap-3">
      <button onClick={() => setOpen(true)} className="text-xs px-3 py-1.5 rounded border border-line hover:bg-hair">{label}</button>
      <Result state={state} />
    </div>
  );
  return (
    <form ref={ref} action={action} className="bg-warmwhite border border-line rounded p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      {scorecardId && <input type="hidden" name="scorecard_id" value={scorecardId} />}
      {departmentId && <input type="hidden" name="department_id" value={departmentId} />}
      {periodId && <input type="hidden" name="period_id" value={periodId} />}
      {note && <p className="col-span-2 md:col-span-4 text-xs text-muted">{note}</p>}
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

// Department page: pick an existing employee from a dropdown to place here.
export function PlaceEmployeeForm({ departmentId, candidates }: {
  departmentId: string; candidates: { id: string; name: string; current: string | null }[];
}) {
  const [state, action] = useAction(placeInDepartment);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => { if (state?.ok) setFormKey((k) => k + 1); }, [state]);
  return (
    <form key={formKey} action={action} className="flex items-end gap-3 flex-wrap">
      <input type="hidden" name="department_id" value={departmentId} />
      <label className="w-72">
        <span className={labelCls}>Add employee</span>
        <select name="employee_id" required defaultValue="" className={inputCls} disabled={!candidates.length}>
          <option value="" disabled>{candidates.length ? "Choose from employee list…" : "Everyone is already here"}</option>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.current ? ` (now in ${c.current})` : " (unassigned)"}</option>)}
        </select>
      </label>
      <Submit>Add to department</Submit>
      <Result state={state} />
    </form>
  );
}
