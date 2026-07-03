import Card from "../ui/Card";

const jobs = [
  {
    time: "8:00 AM",
    customer: "John Smith",
    address: "123 Main St",
    status: "Scheduled",
  },
  {
    time: "10:30 AM",
    customer: "Mary Jones",
    address: "45 Oak Drive",
    status: "En Route",
  },
  {
    time: "1:00 PM",
    customer: "Robert Brown",
    address: "89 Pine Lane",
    status: "Pending",
  },
];

export default function TodaysSchedule() {
  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6">
        Today's Schedule
      </h2>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.time}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition"
          >
            <div>
              <p className="font-bold text-slate-800">
                {job.customer}
              </p>

              <p className="text-sm text-slate-500">
                {job.address}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold">
                {job.time}
              </p>

              <p className="text-sm text-blue-600">
                {job.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}