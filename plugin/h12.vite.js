import Transform from "./h12.transform";

const match = /\.(js)$/;

export default function h12Vite() {
    return {
        name: "h12-vite",
        transform(src, id) {
            if(match.test(id)) {
                return {
                    code: Transform(src),
                    map: null
                };
            };
        }
    };
};