import "./../style/main.css";
import H12 from "@library/h12";

@Component
class App extends H12 {
    constructor() {
        super();
    }
    async init() {
        
        this.runTimer();

    }
    async render() {
        return <>
            <div class="w-full h-full overflow-hidden relative flex flex-col p-8 bg-zinc-800">
                <label class="text-4xl font-semibold text-zinc-300">Clock</label>
                <label class="text-md font-semibold text-zinc-400" id="time"></label>
            </div>
        </>;
    }
    runTimer() {

        const { time } = this.element;

        setInterval(() => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:${seconds}`;
            time.textContent = timeString;
        })

    }
}

H12.load(App, ".app");