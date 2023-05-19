import Link from "next/link";
import { Team } from "@8hourrelay/models";
import { JoinTeamButton } from "./JoinTeamButton";
import { Suspense } from "react";

const TABLE_HEAD = ["Name", "Race", ""];

function DisplayTeams({ teams }: { teams: Team[] | null }) {
  console.log(`display team`, { teams });

  if (!teams) {
    return null;
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="table w-full">
        {/* head */}
        <thead>
          <tr>
            {TABLE_HEAD.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const {
              displayName: name,
              isOpen,
              race,
              captainEmail,
            } = new Team(team);
            return (
              <tr key={`${name}-${index}`}>
                <td>
                  <div>
                    <Link href={`/team/${name}`}>
                      <div className="font-bold">{name}</div>
                    </Link>
                  </div>
                </td>
                <td>{race}</td>
                <td className="flex gap-2">
                  {isOpen && (
                    <Suspense fallback={<div>Loading...</div>}>
                      <JoinTeamButton name={name} />
                    </Suspense>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DisplayTeams;