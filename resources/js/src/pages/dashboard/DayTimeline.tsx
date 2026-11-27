import type { CSSProperties } from 'react';
import { PRIORITY_META, ScheduledBlock, formatClock, formatMinutes, formatTimeRange } from './dashboardData';

type PlacedBlock = ScheduledBlock & { startMin: number; endMin: number };

type DayTimelineProps = {
    blocks: ScheduledBlock[];
    /** Minutes since midnight when the viewed day is today, otherwise null. */
    nowMinutes: number | null;
};

const LANE_HEIGHT = 44;
const LANE_GAP = 6;
const TRACK_PADDING = 8;

const hourLabel = (minutes: number) => {
    const hour = Math.floor(minutes / 60) % 24;
    return `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function DayTimeline({ blocks, nowMinutes }: DayTimelineProps) {
    const placed = blocks.filter((block): block is PlacedBlock => block.startMin !== null && block.endMin !== null && block.endMin > block.startMin);

    if (placed.length === 0) return null;

    const earliest = Math.min(...placed.map(block => block.startMin));
    const latest = Math.max(...placed.map(block => block.endMin));
    const windowStart = Math.max(0, Math.floor((earliest - 30) / 60) * 60);
    let windowEnd = Math.min(24 * 60, Math.ceil((latest + 30) / 60) * 60);
    if (windowEnd - windowStart < 240) windowEnd = Math.min(24 * 60, windowStart + 240);
    const span = windowEnd - windowStart;
    const step = span > 720 ? 120 : 60;

    const percent = (minutes: number) => ((minutes - windowStart) / span) * 100;

    const ticks: number[] = [];
    for (let tick = Math.ceil(windowStart / step) * step; tick <= windowEnd; tick += step) ticks.push(tick);

    const laneEnds: number[] = [];
    const positioned = [...placed]
        .sort((a, b) => a.startMin - b.startMin)
        .map(block => {
            let lane = laneEnds.findIndex(end => end <= block.startMin);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(block.endMin);
            } else {
                laneEnds[lane] = block.endMin;
            }
            return { block, lane };
        });
    const laneCount = Math.max(1, laneEnds.length);
    const trackHeight = laneCount * LANE_HEIGHT + (laneCount - 1) * LANE_GAP + TRACK_PADDING * 2;
    const showNow = nowMinutes !== null && nowMinutes >= windowStart && nowMinutes <= windowEnd;

    return (
        <div className="tdb-timeline" role="group" aria-label="Timeline of scheduled segments for the selected day">
            <div className="tdb-timeline__scroll">
                <div className="tdb-timeline__inner">
                    <div className="tdb-timeline__ruler" aria-hidden="true">
                        {ticks.map(tick => (
                            <span key={tick} style={{ left: `${percent(tick)}%` }}>
                                {hourLabel(tick)}
                            </span>
                        ))}
                    </div>
                    <div className="tdb-timeline__track" style={{ height: trackHeight }}>
                        {ticks.map(tick => (
                            <i key={tick} className="tdb-timeline__grid" style={{ left: `${percent(tick)}%` }} aria-hidden="true" />
                        ))}
                        {showNow && nowMinutes !== null && (
                            <i className="tdb-timeline__now" style={{ left: `${percent(nowMinutes)}%` }} aria-hidden="true" title={`Now, ${formatClock(nowMinutes)}`} />
                        )}
                        {positioned.map(({ block, lane }) => (
                            <div
                                key={block.key}
                                className="tdb-block"
                                style={
                                    {
                                        left: `${percent(block.startMin)}%`,
                                        width: `${Math.max(((block.endMin - block.startMin) / span) * 100, 1.5)}%`,
                                        top: TRACK_PADDING + lane * (LANE_HEIGHT + LANE_GAP),
                                        height: LANE_HEIGHT,
                                        '--tdb-block': PRIORITY_META[block.priority].color,
                                    } as CSSProperties
                                }
                                title={`${block.taskName}: ${formatTimeRange(block.startMin, block.endMin)} (${formatMinutes(block.minutes)})`}
                            >
                                <strong>{block.taskName}</strong>
                                <span>{formatTimeRange(block.startMin, block.endMin)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
