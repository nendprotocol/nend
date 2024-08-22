interface vpcPrice {
    price: number
};

const vpcLevels : Record<number, vpcPrice> = {
    1: {
        price : 5
    },
    2: {
        price : 10
    },
    3: {
        price : 20
    },
    4: {
        price : 40
    }
}

export default vpcLevels;