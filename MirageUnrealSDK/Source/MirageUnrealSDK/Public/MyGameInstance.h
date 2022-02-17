// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "MirageClient.h"
#include "MyGameInstance.generated.h"

/**
 * 
 */
UCLASS()
class MIRAGEUNREALSDK_API UMyGameInstance : public UGameInstance
{
	GENERATED_BODY()

	UFUNCTION(Blueprintcallable, Category = "MirageSDK")
	void InitializeMirageSDK();
};
