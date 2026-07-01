const Localization = {
    currentLang: "en",
    data: {},

    async load(path) {
        const text = await fetch(path).then(r => r.text());
        this.data = this.parseCSV(text);
    },

    setLanguage(lang) {
        this.currentLang = lang;
    },

    t(key, params = {}) {
        let text =
            this.data[key]?.[this.currentLang] ??
            this.data[key]?.en ??
            key;

        for (const k in params) {
            text = text.replaceAll(`{${k}}`, params[k]);
        }

        return text;
    },

    parseCSV(csv) {
        const lines = csv.trim().split(/\r?\n/);
        const headers = this.parseLine(lines[0]);

        const result = {};

        for (let i = 1; i < lines.length; i++) {
            const cols = this.parseLine(lines[i]);
            const key = cols[0];

            result[key] = {};
            for (let j = 1; j < headers.length; j++) {
                result[key][headers[j]] = cols[j] ?? "";
            }
        }

        return result;
    },

    parseLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const c = line[i];

            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            }
            else if (c === "," && !inQuotes) {
                result.push(current);
                current = "";
            }
            else {
                current += c;
            }
        }

        result.push(current);

        return result.map(v =>
            v.startsWith('"') && v.endsWith('"')
                ? v.slice(1, -1)
                : v
        );
    }
};

export default Localization;