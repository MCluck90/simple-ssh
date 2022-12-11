interface WithPassword {
  /**
   * Password
   */
  pass: string;
}

interface WithKey {
  /**
   * SSH key
   */
  key: string;

  /**
   * Password
   */
  pass?: string;

  /**
   * Passphrase
   */
  passphrase?: string;
}

interface WithAgent {
  /**
   * Connects with the given SSH agent.
   * If this is set, no need to specify a private key or password.
   */
  agent: string;

  /**
   * Set to true to connect with agent forwarding.
   */
  agentForward: boolean;
}

type Authentication = WithAgent | WithKey | WithPassword;

interface BaseConfig {
  /**
   * Hostname
   */
  host: string;

  /**
   * Port number (default: `22`)
   */
  port?: number;

  /**
   * Username
   */
  user: string;

  /**
   * Connection timeout in milliseconds.
   * Defaults to `10000`
   */
  timeout?: number;

  /**
   * Base directory.
   * If this is set, each command will be preceeded by `cd ${this.baseDir}`
   */
  baseDir?: string;
}
export type SSHConfig = BaseConfig & Authentication;

export interface ExecOptions {
  /**
   * Additional command line arguments (default: `null`)
   */
  args?: string[] | null;

  /**
   * Input to be sent to `stdin`
   */
  in?: string;

  /**
   * `stdout` handler
   */
  out?: (stdout: string) => unknown;

  /**
   * `stderr` handler
   */
  err?: (stderr: string) => unknown;

  /**
   * Exit handler.
   * `stderr` and `stdout` contain the full contents of their respective streams
   */
  exit?: (code: number, stdout: string, stderr: string) => unknown;

  /**
   * Allocates a pseudo-tty, useful for command which require `sudo` (default: `false`)
   */
  pty?: boolean;
}

export interface StartOptions {
  /**
   * Called on successful connection
   */
  success?: () => unknown;

  /**
   * Called if the connection failed
   */
  fail?: (err: Error) => unknown;
}

export default class SSH {
  constructor(config: SSHConfig);

  /**
   * Adds a command to the stack
   */
  exec(command: string, options?: ExecOptions): SSH;

  /**
   * Add a listener for the specified event
   */
  on(event: string, callback: (...args: any[]) => unknown): SSH;

  /**
   * Starts executing the commands
   */
  start(options?: StartOptions): SSH;

  /**
   * Clears the command queue and resets the current connection
   * @param callback Called when the connection has been successfully reset
   */
  reset(callback?: (err?: Error) => unknown): SSH;

  /**
   * Ends the SSH session
   * (this is automatically called at the end of a command queue)
   */
  end(): SSH;

  /**
   * Returns the number of commands
   */
  count(): number;
}
