// src/components/Scheduler.jsx
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const Scheduler = ({ events }) => {
  // Events format: { title: 'U12 vs U13', start: Date, end: Date, resourceId: fieldId }
  
  return (
    <div className="h-screen p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        views={['month', 'week', 'day']}
        step={60}
        showMultiDayTimes
      />
    </div>
  );
};