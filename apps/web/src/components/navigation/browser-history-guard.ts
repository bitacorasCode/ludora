type HistoryEntry = {
    key: string;
    sameDocument: boolean;
};

type HistoryNavigateEvent = Event & {
    navigationType: string;
    info: unknown;
    destination: {
        key: string;
        url: string;
        sameDocument: boolean;
    };
};

type BrowserNavigation = EventTarget & {
    currentEntry: HistoryEntry | null;
    entries: () => HistoryEntry[];
    traverseTo: (
        key: string,
        options?: { info?: unknown },
    ) => {
        committed: Promise<unknown>;
        finished: Promise<unknown>;
    };
};

type HistoryGuardOptions = {
    isBlocked: () => boolean;
    requestNavigation: (action: () => void) => void;
};

const NAVIGATE_EVENT = 'navigate';
const HISTORY_TRAVERSAL = 'traverse';

export function installBrowserHistoryGuard({
    isBlocked,
    requestNavigation,
}: HistoryGuardOptions) {
    const candidate = (
        window as Window & { navigation?: BrowserNavigation }
    ).navigation;

    if (
        !candidate
        || typeof candidate.entries !== 'function'
        || typeof candidate.traverseTo !== 'function'
    ) {
        return;
    }

    const navigation = candidate;
    const approvedTraversal = Symbol();
    let disposed = false;

    function handleNavigate(nativeEvent: Event) {
        const event = nativeEvent as HistoryNavigateEvent;

        if (
            event.navigationType !== HISTORY_TRAVERSAL
            || event.info === approvedTraversal
            || event.defaultPrevented
            || !event.cancelable
            || !event.destination.sameDocument
            || !isBlocked()
        ) {
            return;
        }

        const sourceKey = navigation.currentEntry?.key;
        const destinationKey = event.destination.key;

        if (!sourceKey || !destinationKey) return;

        const sourceHref = window.location.href;
        const current = new URL(sourceHref);
        const destination = new URL(event.destination.url);

        if (destination.origin !== current.origin) return;

        const isSameRoute =
            destination.pathname === current.pathname
            && destination.search === current.search;

        if (isSameRoute) return;

        event.preventDefault();

        requestNavigation(() => {
            if (
                disposed
                || navigation.currentEntry?.key !== sourceKey
                || window.location.href !== sourceHref
            ) {
                return;
            }

            const destinationExists = navigation.entries().some(
                (entry) =>
                    entry.key === destinationKey
                    && entry.sameDocument,
            );

            if (!destinationExists) return;

            const traversal = navigation.traverseTo(
                destinationKey,
                { info: approvedTraversal },
            );

            // A competing navigation can cancel either promise.
            void Promise.allSettled([
                traversal.committed,
                traversal.finished,
            ]);
        });
    }

    navigation.addEventListener(NAVIGATE_EVENT, handleNavigate);

    return () => {
        disposed = true;
        navigation.removeEventListener(NAVIGATE_EVENT, handleNavigate);
    };
}