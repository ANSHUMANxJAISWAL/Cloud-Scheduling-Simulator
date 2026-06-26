import React, { useState, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  flexRender 
} from '@tanstack/react-table';
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function MetricsTable({ simulationResult }) {
  const [sorting, setSorting] = useState([]);

  const data = useMemo(() => {
    return simulationResult?.metrics?.processes || [];
  }, [simulationResult]);

  const avgWait = useMemo(() => {
    return simulationResult?.metrics?.aggregate?.avg_waiting_time || 0.0;
  }, [simulationResult]);

  const columns = useMemo(() => [
    {
      accessorKey: 'pid',
      header: 'PID',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'arrival_time',
      header: 'Arrival (ms)',
      cell: info => info.getValue().toFixed(1),
    },
    {
      accessorKey: 'burst_time',
      header: 'Burst (ms)',
      cell: info => info.getValue().toFixed(1),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'waiting_time',
      header: 'Wait Time (ms)',
      cell: info => {
        const val = info.getValue();
        let colorClass = "text-success bg-success/5";
        let status = "Healthy";
        
        if (val > 3.0 * avgWait) {
          colorClass = "text-danger bg-red-950/45 border-danger/30 font-bold border";
          status = "Starved";
        } else if (val > 2.0 * avgWait) {
          colorClass = "text-danger bg-danger/10 font-semibold";
          status = "At Risk";
        } else if (val > avgWait) {
          colorClass = "text-warning bg-warning/10";
          status = "Delayed";
        }
        
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${colorClass}`}>
              {val.toFixed(1)}
            </span>
            {status !== "Healthy" && (
              <span className="text-[9px] font-mono uppercase opacity-75 hidden sm:inline">
                ({status})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'turnaround_time',
      header: 'Turnaround (ms)',
      cell: info => info.getValue().toFixed(1),
    },
    {
      accessorKey: 'response_time',
      header: 'Response (ms)',
      cell: info => info.getValue().toFixed(1),
    },
    {
      accessorKey: 'completion_time',
      header: 'Completion (ms)',
      cell: info => info.getValue().toFixed(1),
    },
    {
      accessorKey: 'cpu_utilization_share',
      header: 'CPU Share %',
      cell: info => `${info.getValue().toFixed(1)}%`,
    },
    {
      accessorKey: 'context_switches',
      header: 'Switches',
      cell: info => info.getValue(),
    },
  ], [avgWait]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = [
      "PID", "Name", "Arrival Time", "Burst Time", "Priority", 
      "Wait Time", "Turnaround Time", "Response Time", 
      "Completion Time", "CPU Share %", "Context Switches"
    ];
    const rows = data.map(p => [
      p.pid, p.name, p.arrival_time, p.burst_time, p.priority, 
      p.waiting_time, p.turnaround_time, p.response_time, 
      p.completion_time, p.cpu_utilization_share, p.context_switches
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nebula_metrics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!simulationResult) return null;

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-border flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-300">
            Process Metrics Scorecard
          </h3>
          <p className="text-xs text-textSecondary font-mono mt-1">
            Sortable statistics for each simulated job. Color thresholds indicate waiting quality.
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 bg-surface hover:bg-border border border-border px-3.5 py-2 rounded-xl text-xs font-medium text-textPrimary transition-all duration-300"
          title="Export CSV"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-surface/80 text-textSecondary border-b border-border select-none">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th 
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3.5 hover:bg-border/50 cursor-pointer font-bold transition-all"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        <span>
                          {sorted === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-accent" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-textSecondary/40 hover:text-textPrimary" />
                          )}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/60">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-surface/30 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-textPrimary leading-relaxed align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
