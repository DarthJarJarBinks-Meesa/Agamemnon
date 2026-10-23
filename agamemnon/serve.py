import signal
import subprocess
import sys
import time

from agamemnon.seed import ensure_runtime


def main() -> None:
    ensure_runtime()
    commands = [
        [sys.executable, "-m", "agamemnon.public_server"],
        [sys.executable, "-m", "agamemnon.analyst_server"],
    ]
    processes = [subprocess.Popen(command) for command in commands]
    print("Public assistant   http://127.0.0.1:8000")
    print("Examiner console   http://127.0.0.1:8001")
    print("Analyst password   analyst  (override with AGAMEMNON_ANALYST_PASSWORD)")

    def stop(*_args) -> None:
        for process in processes:
            if process.poll() is None:
                process.terminate()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    stop()
                    raise SystemExit(code)
            time.sleep(0.3)
    except KeyboardInterrupt:
        stop()
        raise SystemExit(0)


if __name__ == "__main__":
    main()
