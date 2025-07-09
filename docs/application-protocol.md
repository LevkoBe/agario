<table>
<tr>
  <th>Message Type</th>
  <th>Direction</th>
  <th>When Sent</th>
  <th>Payload Format</th>
  <th>Description & Details</th>
</tr>

<tr>
  <td><code>join</code></td>
  <td>Client → Server</td>
  <td>On initial connection</td>
  <td>
    <pre><code>{
  "type": "join",
  "nickname": "Player123",
  "mode"?: "ffa" | "teams" | "sandbox",
  "privateRoom"?: true | Guid
}</code></pre>
  </td>
  <td>Registers a robot in the arena with a chosen nickname and game mode.</td>
</tr>

<tr>
  <td><code>spawnConfirm</code></td>
  <td>Server → Client</td>
  <td>After join</td>
  <td>
    <pre><code>{
  "type": "spawnConfirm",
  "id": Guid,
  "nickname": string,
  "roomId": Guid,
  "initialMass": number
}</code></pre>
  </td>
  <td>Confirms robot creation and returns spawn parameters (ID, mass, room).</td>
</tr>

<tr>
  <td><code>move</code></td>
  <td>Client → Server</td>
  <td>On mouse movement</td>
  <td>
    <pre><code>{
  "type": "move",
  "direction": {
    "x": number,
    "y": number
  }
}</code></pre>
  </td>
  <td>Sets robot movement direction vector.</td>
</tr>

<tr>
  <td><code>activateTool</code></td>
  <td>Client → Server</td>
  <td>On key/tool press</td>
  <td><pre><code>{
  "type": "activateTool",
  "tool": "blaster" | "magnet" | "teleport" | "transformer",
  "target"?: { "x": number, "y": number }
}</code></pre></td>
  <td>Activates a robot's equipped tool. Some tools may require a target coordinate.</td>
</tr>

<tr>
  <td><code>dropJunk</code></td>
  <td>Client → Server</td>
  <td>On junk-release action</td>
  <td><pre><code>{
  "type": "dropJunk"
}</code></pre></td>
  <td>Releases a portion of collected junk (used to bait or construct).</td>
</tr>

<tr>
  <td><code>constructBase</code></td>
  <td>Client → Server</td>
  <td>On base placement</td>
  <td><pre><code>{
  "type": "constructBase",
  "position": {
    "x": number,
    "y": number
  }
}</code></pre></td>
  <td>Attempts to create a base at the given location using stored resources.</td>
</tr>

<tr>
  <td><code>gameState</code></td>
  <td>Server → Client</td>
  <td>Every frame (~60 fps)</td>
  <td><pre><code>{
  "type": "gameState",
  "robots": [
    {
      "id": Guid,
      "nickname": string,
      "mass": number,
      "tools": string[],
      "position": { "x": number, "y": number },
      "radius": number,
      "color": string
    }
  ],
  "junk": [
    {
      "id": Guid,
      "position": { "x": number, "y": number },
      "mass": number,
      "type"?: "metal" | "circuit" | "energy"
    }
  ],
  "structures": [
    {
      "id": Guid,
      "position": { "x": number, "y": number },
      "type": "base" | "wall",
      "health": number,
      "ownerId"?: Guid
    }
  ],
  "timestamp": number
}</code></pre></td>
  <td>Full state update of visible robots, junk, and immovable structures.</td>
</tr>

<tr>
  <td><code>destroyed</code></td>
  <td>Server → Client</td>
  <td>When a robot is destroyed</td>
  <td><pre><code>{
  "type": "destroyed",
  "score": number,
  "by": Guid | null
}</code></pre></td>
  <td>Indicates player was destroyed, with final score and attacker (if any).</td>
</tr>

<tr>
  <td><code>leaderboard</code></td>
  <td>Server → Client</td>
  <td>Every 1 second</td>
  <td><pre><code>{
  "type": "leaderboard",
  "top": [
    { "nickname": string, "mass": number }
  ],
  "self": {
    "rank": number,
    "mass": number
  }
}</code></pre></td>
  <td>Leaderboard with rankings and player's own position.</td>
</tr>

<tr>
  <td><code>playerLeft</code></td>
  <td>Server → All Clients</td>
  <td>When someone disconnects</td>
  <td><pre><code>{
  "type": "playerLeft",
  "id": Guid
}</code></pre></td>
  <td>Notifies clients to remove robot from field.</td>
</tr>

</table>
