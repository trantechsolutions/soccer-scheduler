import { isWithinInterval, areIntervalsOverlapping, parseISO } from 'date-fns';

/**
 * Validates if a match can be scheduled.
 * * @param {Object} proposal - { start: Date, end: Date, fieldId: string, homeTeamId: string, awayTeamId: string }
 * @param {Array} existingMatches - Array of already scheduled match objects
 * @param {Array} fieldPermits - Array of { fieldId, start: Date, end: Date }
 * @param {Array} teamBlackouts - Array of { teamId, start: Date, end: Date }
 */
export const validateMatch = (proposal, existingMatches, fieldPermits, teamBlackouts) => {
  const errors = [];

  // 1. CHECK FIELD AVAILABILITY (PERMITS)
  // Does the club actually own the field for this specific time slot?
  const hasPermit = fieldPermits.some(permit => 
    permit.fieldId === proposal.fieldId &&
    isWithinInterval(proposal.start, { start: permit.start, end: permit.end }) &&
    isWithinInterval(proposal.end, { start: permit.start, end: permit.end })
  );

  if (!hasPermit) {
    errors.push("No permit for this field at this time.");
  }

  // 2. CHECK FIELD CONFLICTS (Double Booking)
  // Is there another match already scheduled on this field?
  const fieldConflict = existingMatches.find(match => 
    match.fieldId === proposal.fieldId &&
    areIntervalsOverlapping(
      { start: proposal.start, end: proposal.end },
      { start: match.start, end: match.end }
    )
  );

  if (fieldConflict) {
    errors.push(`Field conflict with Match ${fieldConflict.id}`);
  }

  // 3. CHECK TEAM AVAILABILITY (Blackouts)
  // Did the home or away team block this time off?
  const teamsInvolved = [proposal.homeTeamId, proposal.awayTeamId];
  
  const teamConflict = teamBlackouts.find(blackout => 
    teamsInvolved.includes(blackout.teamId) &&
    areIntervalsOverlapping(
      { start: proposal.start, end: proposal.end },
      { start: blackout.start, end: blackout.end }
    )
  );

  if (teamConflict) {
    errors.push(`Team scheduling conflict (Blackout date found).`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};