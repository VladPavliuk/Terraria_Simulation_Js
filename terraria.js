let responseBody = {
    generalInfo: {},
    bots: [],
    targets: []
};

let botBlueprint = function (name) {
    return {
        name: name,
        health: {
            value: 100
        },
        sensor: {
            active: false,
            targetId: null,
            length: 50
        },
        direction: {
            changeRate: 5,
            currentChangeRate: 0,
            speed: 5,
            _innerAngle: 45,
            set angle(value) {
                this._innerAngle = value % 360;
            },

            get angle() {
                return this._innerAngle;
            }
        },
        location: {
            x: globalConfigs.map.width / 2,
            y: globalConfigs.map.height / 2
        },
        size: 10
    };
};

let globalConfigs = {
    map: {
        width: 600,
        height: 600
    },
    includeChildrenGeneration: true,
    includeHealthReducing: true,
    yearIterations: 30,
    currentYearIterations: 0,
    greatStarvationsAmount: -1,
    context: null
};

let fromPolarToCartesian = (length, angleInDegrees) => {
    return {
        x: length * Math.cos(angleInDegrees / 180 * Math.PI),
        y: length * Math.sin(angleInDegrees / 180 * Math.PI)
    };
};

let inCircle = (pointToCheck, circle) => {
    return Math.pow(pointToCheck.x - circle.x, 2) + Math.pow(pointToCheck.y - circle.y, 2) <= Math.pow(circle
        .radius, 2);
};

let distanceBetweenTwoPoints = (firstPoint, secondPoint) => {
    return Math.round(Math.sqrt(Math.pow(firstPoint.x - secondPoint.x, 2) + Math.pow(firstPoint.y - secondPoint.y, 2)));
};

let distanceBetweenTwoRectangles = (firstRect, secondRect) => {
    let horizontalDistance = 0;

    if (secondRect.x1 > firstRect.x2) {
        horizontalDistance = secondRect.x1 - firstRect.x2;
    } else if (firstRect.x1 > secondRect.x2) {
        horizontalDistance = firstRect.x1 - secondRect.x2;
    }

    let verticalDistance = 0;

    if (secondRect.y1 > firstRect.y2) {
        verticalDistance = secondRect.y1 - firstRect.y2;
    } else if (firstRect.y1 > secondRect.y2) {
        verticalDistance = firstRect.y1 - secondRect.y2;
    }

    return Math.round(Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2)));
};

let calculateTargets = targets => {
    if (targets.spawn.threshold <= targets.spawn.counter) {
        let x = Math.round(Math.random() * globalConfigs.map.width);
        let y = Math.round(Math.random() * globalConfigs.map.height);

        targets.items.push({
            id: targets.primaryIndexCounter,
            location: {
                x,
                y
            }
        });
        targets.spawn.counter = 0;
        targets.primaryIndexCounter++;
    } else {
        targets.spawn.counter++;
    }
};

let makeBotsOlder = bots => {
    if (globalConfigs.includeHealthReducing) {
        for (let bot of bots) {
            let speedFactor = bot.direction.speed;
            let sensorLengthFactor = bot.sensor.length / 10;

            bot.health.value -= Math.round(speedFactor + sensorLengthFactor);
        }
    }
};

let searchBotTarget = (bot, targets) => {
    let botTargets = [];

    for (let target of targets.items) {
        let pointToCheck = {
            x: target.location.x,
            y: target.location.y,
        };
        let circle = {
            x: bot.location.x,
            y: bot.location.y,
            radius: bot.sensor.length
        };

        if (inCircle(pointToCheck, circle)) {
            botTargets.push({
                id: target.id,
                distance: distanceBetweenTwoPoints({
                    x: target.location.x,
                    y: target.location.y
                }, {
                    x: bot.location.x,
                    y: bot.location.y
                })
            });
        }
    }

    if (botTargets.length === 0) {
        bot.sensor.active = false;
        return;
    }

    bot.sensor.active = true;
    let nearestTarget = botTargets[0];

    for (let target of botTargets) {
        if (target.distance < nearestTarget.distance) {
            nearestTarget = {
                id: target.id
            }
        }
    }

    bot.sensor.targetId = nearestTarget.id;
};

let getTargetById = (id, targets) => {
    let element = targets.items.find(element => element.id === id);

    if (element === undefined)
        return null;

    return {
        element,
        key: targets.items.findIndex(element => element.id === id)
    };
};

let isBotReachAnyTarget = (bot, targets) => {
    for (let [index, target] of targets.items.entries()) {
        let distance = distanceBetweenTwoRectangles({
            x1: bot.location.x,
            y1: bot.location.y,
            x2: bot.location.x + bot.size,
            y2: bot.location.y + bot.size
        }, {
            x1: target.location.x,
            y1: target.location.y,
            x2: target.location.x + 5,
            y2: target.location.y + 5
        });

        if (distance <= bot.direction.speed) {
            targets.items.splice(index, 1);
            bot.health.value += 50;
        }
    }
};

let calculateBots = bots => {
    globalConfigs.currentYearIterations++;

    if (globalConfigs.currentYearIterations >= globalConfigs.yearIterations) {
        makeBotsOlder(bots);
        globalConfigs.currentYearIterations = 0;
    }

    if (bots.length === 0) {
        bots.push(new botBlueprint('Bot 1'));
        globalConfigs.greatStarvationsAmount++;
    }

    for (let [index, bot] of bots.entries()) {
        if (bot.health.value <= 0) {
            bots.splice(index, 1)
        } else if (globalConfigs.includeChildrenGeneration && bot.health.value >= 200) {
            let newBot = new botBlueprint('Bot ' + bots.length);
            newBot.direction.speed = bot.direction.speed + Math.round(Math.random() * 4 - 2);
            newBot.sensor.length = bot.sensor.length + Math.round(Math.random() * 4 - 2);
            newBot.direction.changeRate = bot.direction.changeRate + Math.round(Math.random() * 2 - 1);
            bots.push(newBot);
            bot.health.value = 50;
        }

        searchBotTarget(bot, targets);
        isBotReachAnyTarget(bot, targets);

        if (bot.location.y <= 0) {
            bot.direction.angle = 90;
        } else if (bot.location.y + bot.size >= globalConfigs.map.height) {
            bot.direction.angle = 270;
        }

        if (bot.location.x <= 0) {
            bot.direction.angle = 0;
        } else if (bot.location.x + bot.size >= globalConfigs.map.width) {
            bot.direction.angle = 180;
        }

        let locationChange = fromPolarToCartesian(bot.direction.speed, bot.direction.angle);

        bot.location.y += Math.round(locationChange.y);
        bot.location.x += Math.round(locationChange.x);

        if (bot.sensor.active) {
            let target = getTargetById(bot.sensor.targetId, targets);

            if (target) {
                target = target.element;
                let angleBetweenTargetAndBot = Math.atan2(target.location.y - bot.location.y, target.location.x - bot.location.x);

                bot.direction.angle = Math.round(angleBetweenTargetAndBot / Math.PI * 180);
            }
        } else {
            if (bot.direction.currentChangeRate >= bot.direction.changeRate) {
                bot.direction.angle = Math.round(Math.random() * 360);

                bot.direction.currentChangeRate = 0;
            }

            bot.direction.currentChangeRate++;
        }
    }
};

let bots = [];
let targets = {
    items: [],
    spawn: {
        threshold: 10,
        counter: 0
    },
    primaryIndexCounter: 1
};

let writeResponse = () => {
    responseBody = {
        bots,
        targets,
        greatStarvationsAmount: globalConfigs.greatStarvationsAmount
    };
};

setInterval(() => {
    calculateTargets(targets);
    calculateBots(bots, targets);
    writeResponse();

    module.exports.data = responseBody;
}, 50);

module.exports = {
    data: responseBody
};
