import os

DIRECTORY_MARKER = 32768
FILE_MARKER = 16384


def notify(*args: str) -> None:
    print(*args)  # noqa: T201


def join(path_a: str, path_b: str) -> str:
    return f"{path_a}/{path_b}"


def list_files(base: str) -> list:
    # micropython: -> ignore attr-defined
    return [d[0] for d in os.ilistdir(base) if d[1] == FILE_MARKER]  # type: ignore[attr-defined]


def list_directories(base: str) -> list:
    # micropython: -> ignore attr-defined
    return [d[0] for d in os.ilistdir(base) if d[1] == DIRECTORY_MARKER]  # type: ignore[attr-defined]


def cleanup(base: str = ".") -> None:
    notify(f"Cleaning up {base}")

    for f in list_directories(base):
        file_to_remove = join(base, f)
        notify(f"removing file: {file_to_remove}")
        os.remove(file_to_remove)  # noqa:  PTH107 (micropython)

    for d in list_files(base):
        dir_to_remove = join(base, d)
        notify(f"removing dir: {dir_to_remove}")
        cleanup(dir_to_remove)
        os.rmdir(dir_to_remove)  # noqa:  PTH106 (micropython)


if __name__ == "__main__":
    cleanup(".")
