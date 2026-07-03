import Card from "../ui/Card";

const events = [
  {
    status: "success",
    title: "John Smith approved Estimate #1042",
    description: "15 minutes ago",
  },
  {
    status: "warning",
    title: "Follow up with Mary Jones",
    description: "Estimate sent 3 days ago",
  },
  {
    status: "info",
    title: "Tomorrow",
    description: "4 jobs scheduled",
  },
  {
    status: "success",
    title: "Revenue Goal",
    description: "$0 of $2,500 today",
  },
];

const dotColors = {
  success: "bg-green-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

export default function BusinessPulse() {
  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6">
        Business Pulse
      </h2>

      <div className="space-y-5">
        {events.map((event) => (
          <div
            key={event.title}
            className="flex items-start gap-4"
          >
            <div
              className={`w-3 h-3 rounded-full mt-2 ${dotColors[event.status as keyof typeof dotColors]}`}
            />

            <div>
              <p className="font-semibold text-slate-800">
                {event.title}
              </p>

              <p className="text-sm text-slate-500">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}